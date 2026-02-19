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


## Docker Setup

### Prerequisites
- Docker & Docker Compose

### Getting Started
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd lantern
   ```

2. Run the automated setup script:
   - **Linux/Mac:**
     ```bash
     ./bin/setup.sh
     ```
     *(Note: If you encounter permission errors, run with `sudo ./bin/setup.sh`)*
   - **Windows:**
     Double-click `bin/setup.bat` or run in terminal:
     ```cmd
     bin\setup.bat
     ```

3. Access the application:
   - **Frontend/Backend:** [http://localhost:8000](http://localhost:8000)

### Running Commands
To run Artisan or Composer commands inside the container:
```bash
docker compose exec app php artisan migrate
docker compose exec app composer install
```
