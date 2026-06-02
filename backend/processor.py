from __future__ import annotations

import os
import shutil
import subprocess
import uuid
from pathlib import Path

from pdf2image import convert_from_path

from analyzer import analyze_presentation_context, analyze_slide
from database import SessionLocal
from models import Presentation, Slide

STORAGE_DIR = Path("storage")
UPLOADS_DIR = STORAGE_DIR / "uploads"
THUMBNAILS_DIR = STORAGE_DIR / "thumbnails"


def ensure_dirs():
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)


def _find_libreoffice() -> str | None:
    candidates = [
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
        "/usr/bin/libreoffice",
        "/usr/bin/soffice",
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return shutil.which("libreoffice") or shutil.which("soffice")


def _pdf_to_images(pdf_path: str, output_dir: str) -> list[str]:
    images = convert_from_path(pdf_path, dpi=150, fmt="png")
    image_paths = []
    for i, image in enumerate(images, start=1):
        img_path = Path(output_dir) / f"slide_{i:03d}.png"
        image.save(str(img_path), "PNG", optimize=True)
        image_paths.append(str(img_path))
    return image_paths


def _pptx_to_images(pptx_path: str, output_dir: str) -> list[str]:
    soffice = _find_libreoffice()
    if not soffice:
        raise RuntimeError(
            "LibreOffice não encontrado. Instale com: brew install --cask libreoffice"
        )

    result = subprocess.run(
        [soffice, "--headless", "--convert-to", "pdf", "--outdir", output_dir, pptx_path],
        capture_output=True,
        text=True,
        timeout=120,
    )

    if result.returncode != 0:
        raise RuntimeError(f"LibreOffice falhou: {result.stderr}")

    pdf_path = Path(output_dir) / (Path(pptx_path).stem + ".pdf")
    if not pdf_path.exists():
        raise RuntimeError(f"PDF não gerado em {pdf_path}")

    images = convert_from_path(str(pdf_path), dpi=150, fmt="png")
    image_paths = []

    for i, image in enumerate(images, start=1):
        img_path = Path(output_dir) / f"slide_{i:03d}.png"
        image.save(str(img_path), "PNG", optimize=True)
        image_paths.append(str(img_path))

    pdf_path.unlink(missing_ok=True)
    return image_paths


def process_presentation(file_path: str, original_filename: str, presentation_id: str):
    db = SessionLocal()
    try:
        presentation = db.query(Presentation).filter(Presentation.id == presentation_id).first()

        thumb_dir = THUMBNAILS_DIR / presentation_id
        thumb_dir.mkdir(parents=True, exist_ok=True)

        ext = Path(original_filename).suffix.lower()
        if ext == ".pdf":
            slide_images = _pdf_to_images(file_path, str(thumb_dir))
        else:
            slide_images = _pptx_to_images(file_path, str(thumb_dir))

        if presentation:
            presentation.total_slides = len(slide_images)
            db.commit()

        # Passo 0 — entender o objetivo global antes de analisar slide a slide
        sample = slide_images[:min(5, len(slide_images))]
        print(f"[Contexto] Analisando {len(sample)} slides de amostra...")
        context = analyze_presentation_context(sample)
        print(f"[Contexto] {context.get('tipo_documento')} | {context.get('setor')} | {context.get('tipo_deal')}")

        if presentation and context:
            presentation.tipo_documento = context.get("tipo_documento")
            presentation.objetivo_geral = context.get("objetivo_geral")
            presentation.setor = context.get("setor")
            presentation.narrativa_geral = context.get("narrativa")
            presentation.empresa_alvo = context.get("empresa_alvo")
            presentation.banco_assessor = context.get("banco_assessor")
            db.commit()

        for i, image_path in enumerate(slide_images, start=1):
            analysis = analyze_slide(image_path, i, context=context)

            slide = Slide(
                slide_id=str(uuid.uuid4()),
                presentation_id=presentation_id,
                arquivo_origem=original_filename,
                numero_slide=i,
                titulo=analysis.get("titulo"),
                descricao=analysis.get("descricao"),
                categoria_principal=analysis.get("categoria_principal"),
                categorias_secundarias=analysis.get("categorias_secundarias", []),
                tags=analysis.get("tags", []),
                layout=analysis.get("layout"),
                elementos_visuais=analysis.get("elementos_visuais", []),
                idioma=analysis.get("idioma"),

                densidade=analysis.get("densidade"),
                tipo_deal=analysis.get("tipo_deal"),
                thumbnail_url=f"/thumbnails/{presentation_id}/slide_{i:03d}.png",
                arquivo_editavel_url=f"/uploads/{presentation_id}/{original_filename}",
            )
            db.add(slide)

            if presentation:
                presentation.processed_slides = i
            db.commit()

            print(f"[{i}/{len(slide_images)}] {analysis.get('titulo')}")

        if presentation:
            presentation.status = "completed"
            db.commit()

    except Exception as e:
        if presentation:
            presentation.status = "error"
            db.commit()
        print(f"Erro no processamento: {e}")
        raise
    finally:
        db.close()
