from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
import os
import uuid

app = FastAPI(title="NEET Operational Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = "progress.json"

# --- Payload Models ---
class MasterTaskUpdate(BaseModel):
    subject: str
    chapter_id: str
    task_id: str
    status: Optional[str] = None
    is_relevant: Optional[bool] = None

class MasterTaskAdd(BaseModel):
    subject: str
    chapter_id: str
    task_name: str

class DailyTargetAdd(BaseModel):
    date_str: str
    subject: str
    chapter_id: str
    custom_task_name: Optional[str] = None

class DailyTaskUpdate(BaseModel):
    date_str: str
    chapter_id: str
    task_id: str
    status: str

class WrapUpDay(BaseModel):
    date_str: str

class BacklogMove(BaseModel):
    original_date: str
    target_date: str
    chapter_id: str
    task_id: str

class MockTestAdd(BaseModel):
    date_str: str
    score: int
    flagged_chapter_ids: List[str]

# --- Core Functions ---
def load_data():
    if not os.path.exists(DATA_FILE):
        raise HTTPException(status_code=500, detail="progress.json not found.")
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

def recalculate_progress(data):
    for subject_name, subject_data in data["subjects"].items():
        subject_relevant_tasks = 0
        subject_completed_tasks = 0
        for chapter in subject_data["chapters"]:
            relevant_tasks = [t for t in chapter["tasks"] if t.get("is_relevant", True)]
            chap_total = len(relevant_tasks)
            chap_completed = sum(1 for t in relevant_tasks if t["status"] == "completed")
            chapter["completion_percentage"] = round((chap_completed / chap_total) * 100, 1) if chap_total > 0 else 0
            subject_relevant_tasks += chap_total
            subject_completed_tasks += chap_completed
        subject_data["overall_progress"] = round((subject_completed_tasks / subject_relevant_tasks) * 100, 1) if subject_relevant_tasks > 0 else 0
    return data

# --- API Endpoints ---
@app.get("/api/progress")
def get_progress():
    return load_data()

# 1. ADD/REMOVE MASTER TASKS
@app.post("/api/master/task/add")
def add_master_task(req: MasterTaskAdd):
    data = load_data()
    try:
        chapter = next(c for c in data["subjects"][req.subject]["chapters"] if c["chapter_id"] == req.chapter_id)
        chapter["tasks"].append({
            "task_id": f"t_{uuid.uuid4().hex[:6]}",
            "name": req.task_name,
            "status": "pending",
            "is_relevant": True
        })
        data = recalculate_progress(data)
        save_data(data)
        return data
    except StopIteration:
        raise HTTPException(status_code=404)

@app.delete("/api/master/task/{subject}/{chapter_id}/{task_id}")
def delete_master_task(subject: str, chapter_id: str, task_id: str):
    data = load_data()
    try:
        chapter = next(c for c in data["subjects"][subject]["chapters"] if c["chapter_id"] == chapter_id)
        chapter["tasks"] = [t for t in chapter["tasks"] if t["task_id"] != task_id]
        data = recalculate_progress(data)
        save_data(data)
        return data
    except StopIteration:
        raise HTTPException(status_code=404)

@app.put("/api/master/task")
def update_master_task(req: MasterTaskUpdate):
    data = load_data()
    try:
        chapter = next(c for c in data["subjects"][req.subject]["chapters"] if c["chapter_id"] == req.chapter_id)
        task = next(t for t in chapter["tasks"] if t["task_id"] == req.task_id)
        if req.status is not None: task["status"] = req.status
        if req.is_relevant is not None: task["is_relevant"] = req.is_relevant
        data = recalculate_progress(data)
        save_data(data)
        return data
    except StopIteration:
        raise HTTPException(status_code=404)

# 2. DAILY TARGET OPERATIONS
@app.post("/api/daily/add")
def add_to_daily_target(req: DailyTargetAdd):
    data = load_data()
    daily_entry = next((d for d in data["daily_target"] if d["date"] == req.date_str and d["chapter_id"] == req.chapter_id), None)
    
    if req.custom_task_name:
        if not daily_entry: raise HTTPException(status_code=400, detail="Import chapter first")
        daily_entry["tasks"].append({"task_id": f"custom_{uuid.uuid4().hex[:6]}", "name": req.custom_task_name, "status": "pending"})
    else:
        if daily_entry: raise HTTPException(status_code=400, detail="Chapter already in today's target")
        try:
            chapter = next(c for c in data["subjects"][req.subject]["chapters"] if c["chapter_id"] == req.chapter_id)
            relevant_tasks = [{"task_id": t["task_id"], "name": t["name"], "status": "pending"} for t in chapter["tasks"] if t.get("is_relevant", True)]
            data["daily_target"].append({"date": req.date_str, "chapter_id": chapter["chapter_id"], "chapter_name": chapter["name"], "tasks": relevant_tasks})
        except StopIteration:
            raise HTTPException(status_code=404)
    save_data(data)
    return data

@app.put("/api/daily/task")
def update_daily_task(req: DailyTaskUpdate):
    data = load_data()
    try:
        daily_entry = next(d for d in data["daily_target"] if d["date"] == req.date_str and d["chapter_id"] == req.chapter_id)
        task = next(t for t in daily_entry["tasks"] if t["task_id"] == req.task_id)
        task["status"] = req.status
        save_data(data)
        return data
    except StopIteration:
        raise HTTPException(status_code=404)

@app.delete("/api/daily/task/{date_str}/{chapter_id}/{task_id}")
def delete_daily_task(date_str: str, chapter_id: str, task_id: str):
    data = load_data()
    daily_entry = next((d for d in data["daily_target"] if d["date"] == date_str and d["chapter_id"] == chapter_id), None)
    if daily_entry:
        daily_entry["tasks"] = [t for t in daily_entry["tasks"] if t["task_id"] != task_id]
        if not daily_entry["tasks"]:
            data["daily_target"] = [d for d in data["daily_target"] if not (d["date"] == date_str and d["chapter_id"] == chapter_id)]
        save_data(data)
    return data

# 3. END OF DAY WRAP UP
@app.post("/api/daily/wrap-up")
def wrap_up_day(req: WrapUpDay):
    data = load_data()
    todays_targets = [d for d in data["daily_target"] if d["date"] == req.date_str]
    
    for target in todays_targets:
        pending_tasks = []
        for t in target["tasks"]:
            if t["status"] == "completed":
                for subj_data in data["subjects"].values():
                    for chap in subj_data["chapters"]:
                        if chap["chapter_id"] == target["chapter_id"]:
                            for mt in chap["tasks"]:
                                if mt["task_id"] == t["task_id"]: mt["status"] = "completed"
            else:
                pending_tasks.append(t)
        
        if pending_tasks:
            existing_backlog = next((b for b in data["backlog"] if b["original_date"] == req.date_str and b["chapter_id"] == target["chapter_id"]), None)
            if existing_backlog:
                existing_backlog["tasks"].extend(pending_tasks)
            else:
                data["backlog"].append({"original_date": req.date_str, "chapter_id": target["chapter_id"], "chapter_name": target["chapter_name"], "tasks": pending_tasks})
                
    data["daily_target"] = [d for d in data["daily_target"] if d["date"] != req.date_str]
    data = recalculate_progress(data)
    save_data(data)
    return data

# 4. BACKLOG OPERATIONS
@app.post("/api/backlog/move")
def move_backlog_to_daily(req: BacklogMove):
    data = load_data()
    task_to_move = None
    
    for b in data["backlog"]:
        if b["original_date"] == req.original_date and b["chapter_id"] == req.chapter_id:
            for t in b["tasks"]:
                if t["task_id"] == req.task_id:
                    task_to_move = t
                    b["tasks"].remove(t)
                    break
    data["backlog"] = [b for b in data["backlog"] if b["tasks"]]
    
    if task_to_move:
        daily_entry = next((d for d in data["daily_target"] if d["date"] == req.target_date and d["chapter_id"] == req.chapter_id), None)
        if daily_entry:
            if not any(t["task_id"] == req.task_id for t in daily_entry["tasks"]):
                daily_entry["tasks"].append(task_to_move)
        else:
            chap_name = "Unknown Chapter"
            for s in data["subjects"].values():
                for c in s["chapters"]:
                    if c["chapter_id"] == req.chapter_id: chap_name = c["name"]
            data["daily_target"].append({"date": req.target_date, "chapter_id": req.chapter_id, "chapter_name": chap_name, "tasks": [task_to_move]})
            
    save_data(data)
    return data

@app.delete("/api/backlog/task/{original_date}/{chapter_id}/{task_id}")
def delete_backlog_task(original_date: str, chapter_id: str, task_id: str):
    data = load_data()
    for b in data["backlog"]:
        if b["original_date"] == original_date and b["chapter_id"] == chapter_id:
            b["tasks"] = [t for t in b["tasks"] if t["task_id"] != task_id]
    data["backlog"] = [b for b in data["backlog"] if b["tasks"]]
    save_data(data)
    return data

# 5. RADAR (MOCK TESTS)
@app.post("/api/radar/mock-test")
def log_mock_test(req: MockTestAdd):
    data = load_data()
    data["mock_tests"].append({"date": req.date_str, "score": req.score, "flagged_chapter_ids": req.flagged_chapter_ids})
    for subject_data in data["subjects"].values():
        for chapter in subject_data["chapters"]:
            if chapter["chapter_id"] in req.flagged_chapter_ids: chapter["is_flagged"] = True
    save_data(data)
    return data

@app.put("/api/radar/unflag/{subject}/{chapter_id}")
def unflag_chapter(subject: str, chapter_id: str):
    data = load_data()
    try:
        chapter = next(c for c in data["subjects"][subject]["chapters"] if c["chapter_id"] == chapter_id)
        chapter["is_flagged"] = False
        save_data(data)
        return data
    except StopIteration:
        raise HTTPException(status_code=404)