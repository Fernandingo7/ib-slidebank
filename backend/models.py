from sqlalchemy import Column, String, Integer, DateTime, JSON
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Optional, List

from database import Base


class Presentation(Base):
    __tablename__ = "presentations"

    id = Column(String, primary_key=True)
    filename = Column(String, nullable=False)
    total_slides = Column(Integer, default=0)
    processed_slides = Column(Integer, default=0)
    upload_date = Column(DateTime, server_default=func.now())
    status = Column(String, default="processing")  # processing | completed | error
    # Contexto global extraído do Passo 0
    tipo_documento = Column(String)
    objetivo_geral = Column(String)
    setor = Column(String)
    narrativa_geral = Column(String)
    empresa_alvo = Column(String)
    banco_assessor = Column(String)


class Slide(Base):
    __tablename__ = "slides"

    slide_id = Column(String, primary_key=True)
    presentation_id = Column(String, nullable=False)
    arquivo_origem = Column(String, nullable=False)
    numero_slide = Column(Integer, nullable=False)
    titulo = Column(String)
    descricao = Column(String)
    categoria_principal = Column(String)
    categorias_secundarias = Column(JSON)
    tags = Column(JSON)
    layout = Column(String)
    elementos_visuais = Column(JSON)
    idioma = Column(String)

    densidade = Column(String)
    tipo_deal = Column(String)
    thumbnail_url = Column(String)
    arquivo_editavel_url = Column(String)
    created_at = Column(DateTime, server_default=func.now())


# Pydantic response schemas
class SlideResponse(BaseModel):
    slide_id: str
    presentation_id: str
    arquivo_origem: str
    numero_slide: int
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    categoria_principal: Optional[str] = None
    categorias_secundarias: Optional[List[str]] = []
    tags: Optional[List[str]] = []
    layout: Optional[str] = None
    elementos_visuais: Optional[List[str]] = []
    idioma: Optional[str] = None

    densidade: Optional[str] = None
    tipo_deal: Optional[str] = None
    thumbnail_url: Optional[str] = None
    arquivo_editavel_url: Optional[str] = None

    class Config:
        from_attributes = True


class PresentationResponse(BaseModel):
    id: str
    filename: str
    total_slides: int
    processed_slides: int
    status: str
    tipo_documento: Optional[str] = None
    objetivo_geral: Optional[str] = None
    setor: Optional[str] = None
    narrativa_geral: Optional[str] = None
    empresa_alvo: Optional[str] = None
    banco_assessor: Optional[str] = None

    class Config:
        from_attributes = True
