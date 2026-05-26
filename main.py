from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os

app = FastAPI(title="NEET Granular Progress Tracker")

# Allow your future frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = "progress.json"

class SubtopicUpdate(BaseModel):
    subject: str
    chapter_index: int
    subtopic_index: int
    new_status: str  # "pending", "in_progress", or "completed"

def load_data():
    if not os.path.exists(DATA_FILE):
        raise HTTPException(status_code=500, detail="Database file not found.")
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

def recalculate_progress(data):
    """Recalculates chapter and subject percentages based on subtopics."""
    for subject_name, subject_data in data["subjects"].items():
        subject_total_subtopics = 0
        subject_completed_subtopics = 0
        
        for chapter in subject_data["chapters"]:
            chap_total = len(chapter["subtopics"])
            chap_completed = sum(1 for sub in chapter["subtopics"] if sub["status"] == "completed")
            
            # Update Chapter Percentage
            chapter["completion_percentage"] = round((chap_completed / chap_total) * 100, 1) if chap_total > 0 else 0
            
            subject_total_subtopics += chap_total
            subject_completed_subtopics += chap_completed
            
        # Update Subject Percentage
        subject_data["overall_progress"] = round((subject_completed_subtopics / subject_total_subtopics) * 100, 1) if subject_total_subtopics > 0 else 0
        
    return data

@app.get("/api/progress")
def get_progress():
    """Fetches the entire syllabus and current progress."""
    return load_data()

@app.put("/api/progress/update")
def update_subtopic_status(update: SubtopicUpdate):
    """Updates a single subtopic and recalculates all percentages."""
    data = load_data()
    
    try:
        # Navigate to the specific subtopic
        target_subtopic = data["subjects"][update.subject]["chapters"][update.chapter_index]["subtopics"][update.subtopic_index]
        target_subtopic["status"] = update.new_status
        
        # Recalculate everything globally
        data = recalculate_progress(data)
        
        # Save to JSON
        save_data(data)
        
        return {"message": "Update successful", "updated_data": data}
    except (KeyError, IndexError):
        raise HTTPException(status_code=400, detail="Invalid subject, chapter, or subtopic index.")