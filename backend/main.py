import shutil
import uuid
from pathlib import Path
from typing import Optional, List

from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

from fastapi import FastAPI, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, or_, cast, String
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Presentation, PresentationResponse, Slide, SlideResponse
from processor import THUMBNAILS_DIR, UPLOADS_DIR, ensure_dirs, process_presentation

Base.metadata.create_all(bind=engine)
ensure_dirs()

app = FastAPI(title="IB Slides — Slide Bank", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/thumbnails", StaticFiles(directory="storage/thumbnails"), name="thumbnails")
app.mount("/uploads", StaticFiles(directory="storage/uploads"), name="uploads")


# ── Upload ──────────────────────────────────────────────────────────────────

@app.post("/api/upload")
async def upload_pptx(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename.endswith((".pptx", ".pdf")):
        raise HTTPException(400, "Apenas arquivos .pptx e .pdf são suportados.")

    presentation_id = str(uuid.uuid4())
    upload_dir = UPLOADS_DIR / presentation_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / file.filename

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    db.add(Presentation(id=presentation_id, filename=file.filename))
    db.commit()

    background_tasks.add_task(
        process_presentation, str(file_path), file.filename, presentation_id
    )

    return {"presentation_id": presentation_id, "status": "processing", "filename": file.filename}


# ── Presentations ────────────────────────────────────────────────────────────

@app.get("/api/presentations", response_model=List[PresentationResponse])
async def list_presentations(db: Session = Depends(get_db)):
    return db.query(Presentation).order_by(Presentation.upload_date.desc()).all()


@app.get("/api/presentations/{presentation_id}/status")
async def get_status(presentation_id: str, db: Session = Depends(get_db)):
    p = db.query(Presentation).filter(Presentation.id == presentation_id).first()
    if not p:
        raise HTTPException(404, "Apresentação não encontrada.")
    return {
        "status": p.status,
        "total_slides": p.total_slides,
        "processed_slides": p.processed_slides,
        "filename": p.filename,
    }


@app.delete("/api/presentations/{presentation_id}")
async def delete_presentation(presentation_id: str, db: Session = Depends(get_db)):
    p = db.query(Presentation).filter(Presentation.id == presentation_id).first()
    if not p:
        raise HTTPException(404, "Apresentação não encontrada.")

    # Remove slides do banco
    db.query(Slide).filter(Slide.presentation_id == presentation_id).delete()
    db.delete(p)
    db.commit()

    # Remove arquivos do disco
    for folder in [THUMBNAILS_DIR / presentation_id, UPLOADS_DIR / presentation_id]:
        if folder.exists():
            shutil.rmtree(folder)

    return {"deleted": presentation_id}


# ── Slides ───────────────────────────────────────────────────────────────────

@app.get("/api/slides", response_model=List[SlideResponse])
async def list_slides(
    categoria: Optional[str] = None,
    tipo_deal: Optional[str] = None,
    idioma: Optional[str] = None,
    densidade: Optional[str] = None,
    search: Optional[str] = None,
    presentation_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    q = db.query(Slide)

    if categoria:
        q = q.filter(Slide.categoria_principal == categoria)
    if tipo_deal:
        q = q.filter(Slide.tipo_deal == tipo_deal)
    if idioma:
        q = q.filter(Slide.idioma == idioma)
    if densidade:
        q = q.filter(Slide.densidade == densidade)
    if presentation_id:
        q = q.filter(Slide.presentation_id == presentation_id)
    if search:
        term = f"%{search}%"
        q = q.filter(
            or_(
                Slide.titulo.ilike(term),
                Slide.descricao.ilike(term),
                Slide.categoria_principal.ilike(term),
                Slide.layout.ilike(term),
                Slide.tipo_deal.ilike(term),
                Slide.densidade.ilike(term),
                Slide.idioma.ilike(term),
                cast(Slide.categorias_secundarias, String).ilike(term),
                cast(Slide.tags, String).ilike(term),
                cast(Slide.elementos_visuais, String).ilike(term),
            )
        )

    return q.order_by(Slide.presentation_id, Slide.numero_slide).offset(skip).limit(limit).all()


@app.get("/api/slides/{slide_id}", response_model=SlideResponse)
async def get_slide(slide_id: str, db: Session = Depends(get_db)):
    slide = db.query(Slide).filter(Slide.slide_id == slide_id).first()
    if not slide:
        raise HTTPException(404, "Slide não encontrado.")
    return slide


# ── Metadata ─────────────────────────────────────────────────────────────────

@app.get("/api/categories")
async def list_categories(db: Session = Depends(get_db)):
    rows = db.query(Slide.categoria_principal).distinct().all()
    return sorted([r[0] for r in rows if r[0]])


@app.get("/api/stats")
async def get_stats(db: Session = Depends(get_db)):
    total_slides = db.query(func.count(Slide.slide_id)).scalar()
    total_presentations = db.query(func.count(Presentation.id)).scalar()
    return {
        "total_slides": total_slides or 0,
        "total_presentations": total_presentations or 0,
    }
