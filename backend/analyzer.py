from __future__ import annotations

import json
import os
import re
import time
from typing import Optional

import google.generativeai as genai
from PIL import Image

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODEL = "gemini-2.5-flash-lite"  # modelo com free tier ativo nesta key

# ── Passo 0: leitura do documento inteiro ────────────────────────────────────

CONTEXT_PROMPT = """Você é um analista sênior de M&A. Analise as imagens abaixo — são as primeiras páginas/slides de uma apresentação corporativa.

Com base nelas, retorne um JSON descrevendo o documento como um todo:

{
  "tipo_documento": "ex: Pitchbook de Sell-Side / CIM / Teaser / Management Presentation / Deck de Credenciais / Tombstone / Relatório de Valuation / Outro",
  "objetivo_geral": "1-2 frases: o que este material busca comunicar ou vender ao leitor",
  "setor": "setor ou indústria da empresa/operação (ex: Saúde, Tecnologia, Agronegócio, Educação, Financeiro)",
  "tipo_deal": "sell-side / buy-side / IPO / debt advisory / fairness opinion / restructuring / credentials / null",
  "empresa_alvo": "nome da empresa ou projeto se identificável, senão null",
  "banco_assessor": "nome do banco ou boutique assessor se identificável, senão null",
  "narrativa": "2-3 frases sobre a história que o material conta: o que o leitor deve concluir ao terminar de ler",
  "idioma": "idioma predominante"
}

Retorne APENAS o JSON válido, sem markdown, sem texto adicional."""

# ── Passo 1-6: análise por slide com contexto ────────────────────────────────

SLIDE_PROMPT_BASE = """Você é um analista sênior de bancos de investimento especializado em apresentações corporativas de M&A.

{context_block}

Analise o slide abaixo e retorne um JSON com a estrutura EXATA. Não inclua texto fora do JSON.

{
  "titulo": "nome do TIPO de slide, genérico e reutilizável (ex: 'Visão Geral do Negócio', 'Highlights Financeiros', 'Sumário Executivo', 'Análise de Comparáveis', 'Estrutura da Transação'). NÃO mencione a empresa, setor ou conteúdo específico. Máx 6 palavras.",
  "descricao": "2-3 frases: propósito do slide, informação que comunica, em que momento de um pitchbook seria reutilizado",
  "categoria_principal": "EXATAMENTE uma das categorias abaixo",
  "categorias_secundarias": ["até 2 categorias secundárias"],
  "tags": ["5 a 12 tags: conceitos financeiros, setor, tipo de deal, técnica de visualização, tom de uso"],
  "layout": "tipo de layout predominante",
  "elementos_visuais": ["elementos visuais presentes no slide"],
  "idioma": "idioma predominante do texto",
  "densidade": "low ou medium ou high",
  "tipo_deal": "sell-side ou buy-side ou IPO ou debt advisory ou fairness opinion ou restructuring ou null"
}

CATEGORIAS OBRIGATÓRIAS (use exatamente este texto):
Capa / Cover | Separador de Seção / Section Divider | Sumário Executivo / Executive Summary | Highlights / Big Numbers | Perfil de Empresa / Company Profile | Visão de Mercado / Market Overview | Análise de Setor / Industry Analysis | Análise Financeira / Financial Analysis | Valuation | Estrutura de Transação / Transaction Structure | Comparáveis de Mercado / Trading Comparables | Comparáveis de Transação / Transaction Comparables | Projeções Financeiras / Financial Projections | Tese de Investimento / Investment Thesis | Riscos e Mitigantes / Risks & Mitigators | Processo de M&A / M&A Process | Perfil de Comprador / Buyer Profile | Pipeline de Aquisições / Acquisition Pipeline | Gestão e Time / Management & Team | Credenciais / Credentials & Tombstones | Disclaimer / Legal | Apêndice / Appendix | Outro

CRITÉRIO DE SCORE (1-5):
1=slide mal organizado, difícil reutilizar | 2=abaixo da média | 3=adequado, com adaptações | 4=bom e bem estruturado | 5=excelente, altamente reutilizável

ELEMENTOS VISUAIS possíveis: tabela, gráfico de barras, gráfico de pizza, waterfall chart, bridge chart, scatter plot, mapa, ícones, foto, logo, diagrama de fluxo, organograma, linha do tempo, football field, sensitivity table, texto, bullet points, big numbers

Retorne APENAS o JSON válido, sem markdown, sem ```json, sem texto adicional."""


def _build_slide_prompt(context: Optional[dict]) -> str:
    if not context:
        return SLIDE_PROMPT_BASE.replace("{context_block}\n\n", "")

    block = (
        "CONTEXTO DO DOCUMENTO (use para classificar este slide com precisão):\n"
        f"- Tipo: {context.get('tipo_documento', 'desconhecido')}\n"
        f"- Objetivo: {context.get('objetivo_geral', '')}\n"
        f"- Setor: {context.get('setor', '')}\n"
        f"- Tipo de deal: {context.get('tipo_deal', '')}\n"
        f"- Narrativa: {context.get('narrativa', '')}\n"
    )
    if context.get("empresa_alvo"):
        block += f"- Empresa alvo: {context['empresa_alvo']}\n"

    return SLIDE_PROMPT_BASE.replace("{context_block}", block)


def _call_gemini(parts: list, max_tokens: int, retries: int = 3) -> str:
    """Chama a API com retry automático em caso de rate limit (429)."""
    model = genai.GenerativeModel(MODEL)
    config = genai.types.GenerationConfig(temperature=0.1, max_output_tokens=max_tokens)
    for attempt in range(retries):
        try:
            response = model.generate_content(parts, generation_config=config)
            return response.text.strip()
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                wait = 60 * (attempt + 1)
                print(f"[Rate limit] Aguardando {wait}s antes de retry {attempt + 1}/{retries}...")
                time.sleep(wait)
            else:
                raise
    raise RuntimeError(f"API falhou após {retries} tentativas")


def analyze_presentation_context(sample_image_paths: list[str]) -> dict:
    """Analisa as primeiras páginas para entender o objetivo geral do material."""
    try:
        parts = [CONTEXT_PROMPT] + [Image.open(p) for p in sample_image_paths]
        text = _call_gemini(parts, max_tokens=512)
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        return json.loads(text.strip())
    except Exception as e:
        print(f"[Contexto] Falha na análise global: {e}")
        return {}


def analyze_slide(image_path: str, slide_number: int, context: Optional[dict] = None) -> dict:
    try:
        prompt = _build_slide_prompt(context)
        img = Image.open(image_path)
        text = _call_gemini([prompt, img], max_tokens=1024)
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        return json.loads(text.strip())
    except json.JSONDecodeError as e:
        print(f"[Slide {slide_number}] JSON parse error: {e}")
        return _fallback(slide_number)
    except Exception as e:
        print(f"[Slide {slide_number}] Analysis error: {e}")
        return _fallback(slide_number)


def _fallback(slide_number: int) -> dict:
    return {
        "titulo": f"Slide {slide_number}",
        "descricao": "Não foi possível analisar este slide automaticamente.",
        "categoria_principal": "Outro",
        "categorias_secundarias": [],
        "tags": [],
        "layout": "desconhecido",
        "elementos_visuais": [],
        "idioma": "desconhecido",
        "densidade": "medium",
        "tipo_deal": None,
    }
