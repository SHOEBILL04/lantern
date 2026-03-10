# **Project Title : Lantern – Smart Study Planner**

---

## Team Members

1. **Aftab Ahmed Fahim**  
   - **Role:** Team Lead  
   - **Email:** aftab.cse.20230104117@aust.edu  
   - **ID:** 20230104117  

2. **Rakibul Islam Emon**  
   - **Role:** Back-end Developer  
   - **Email:** rakibul.cse.20230104105@aust.edu  
   - **ID:** 20230104105  

3. **Rubaiat Ar Rabib**  
   - **Role:** Front-end Developer 
   - **Email:** rubaiat.cse.20230104111@aust.edu  
   - **ID:** 20230104111  

4. **Saiman Ullah**  
   - **Role:** Front-end & Back-end Developer
   - **Email:** saiman.cse.20230104113@aust.edu  
   - **ID:** 20230104113  

---

## Project Overview

### Objective
Lantern is a smart study planning web application designed to help students efficiently organize their study tasks, manage schedules, and track progress. By combining intelligent planning tools with AI-powered quiz generation, Lantern aims to improve productivity, support active learning, and help students prepare effectively for exams.

### Target Audience
- University and college students  
- Self-learners preparing for exams  
- Students managing multiple courses and deadlines  

---

## Tech Stack

### Backend
- Laravel

### Database
- MySQL database

### Frontend
- React.js  
- Tailwind CSS / Bootstrap  

### Rendering Method
- Client-Side Rendering (CSR)  

---

## UI Design
- Mock UI is designed using **Figma** to visualize the overall layout and user flow  
- **Figma Link:** *https://www.figma.com/design/SjoCq7dgkiD8ey0NB5Yp5j/Lantern?node-id=0-1&t=S2IcAi5054vyDLYg-1*  

---

## Project Features

### Core Features
- User authentication (JWT-based login & registration)  
- Create, update, and delete study tasks and schedules  
- Daily, weekly, and monthly study plans  
- Progress tracking with visual charts  
- Deadline reminders and notifications  

### AI-Assisted Features
- AI-powered quiz question generation based on selected topics  
- Automatic answer generation and explanations on user request  
- Support for exam preparation and self-assessment

### CRUD Operations
- Users  
- Study Tasks  
- Subjects / Courses  
- Study Sessions  

### API Endpoints (Approximate)
- `POST /auth/register`  
- `POST /auth/login`  
- `GET /tasks`  
- `POST /tasks`  
- `PUT /tasks/{id}`  
- `DELETE /tasks/{id}`  
- `GET /analytics`  
- `POST /ai/quiz`  

---

## Milestones

### Milestone 1: Core Website Foundation
- Build basic website layout (Navbar, Sidebar, Dashboard)
- Implement authentication system (JWT)    
- Create study tasks and subjects (CRUD)  
- Integrate frontend with backend APIs

### Milestone 2: Study Planning & Tracking
- Daily and weekly study planner  
- Task completion tracking  
- Progress visualization (charts & statistics)  

### Milestone 3: Smart Features & Finalization
- Add AI-based quiz question & answer generation (on user request)
- Study progress and performance insights dashboard  
- Performance optimization  
- Final testing, bug fixing, and deployment  

---

## Setup Instructions (Database-First)
This project has migrated from a code-first architecture (Laravel Eloquent/Migrations) to a strict database-first approach. All logic regarding constraints, cascading, streaks, and dynamic aggregate functionality is handled via Triggers and Stored Procedures.

To initialize your local database:
1. Ensure your local MySQL/MariaDB server is running.
2. Run the `schema.sql` file provided in the repository root:
   ```bash
   mysql -u root -p < schema.sql
   ```
*(Replace `root` with your target username if different. The script provisions `cse3100_testA1` natively).*

