# Citizen Portal - Comprehensive Complaint Management System

## Overview
The Citizen Portal is a web application designed to facilitate the management of complaints by citizens. It allows users to register, log in, create complaints, and view their submitted complaints. This project is built using a Node.js backend with Express and a React frontend.

## Project Structure
```
citizen-portal
├── README.md
├── .gitignore
├── backend
│   ├── package.json
│   ├── .env.example
│   ├── prisma
│   │   ├── schema.prisma
│   │   └── migrations
│   ├── src
│   │   ├── index.js
│   │   ├── app.js
│   │   ├── db
│   │   │   └── prisma.js
│   │   ├── middleware
│   │   │   └── auth.js
│   │   ├── routes
│   │   │   ├── auth.js
│   │   │   └── complaints.js
│   │   ├── controllers
│   │   │   ├── authController.js
│   │   │   └── complaintController.js
│   │   ├── utils
│   │   │   └── jwt.js
│   │   └── seed.js
│   └── scripts
│       └── seed.sh
└── frontend
    ├── package.json
    ├── .env.example
    ├── index.html
    ├── vite.config.js
    ├── src
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── index.css
    │   ├── api
    │   │   └── api.js
    │   ├── context
    │   │   └── AuthContext.jsx
    │   ├── components
    │   │   ├── Navbar.jsx
    │   │   └── ProtectedRoute.jsx
    │   └── pages
    │       ├── auth
    │       │   ├── Login.jsx
    │       │   └── Register.jsx
    │       └── Dashboard.jsx
    └── public
        └── favicon.svg
```

## Backend Setup
1. Navigate to the `backend` directory.
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example` and configure your environment variables.
4. Run database migrations:
   ```
   npm run db:migrate
   ```
5. Start the server:
   ```
   npm run dev
   ```

## Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```

## Usage
- **Register a new user**: Navigate to `/auth/register` and fill out the registration form.
- **Login**: Navigate to `/auth/login` and enter your credentials.
- **Dashboard**: After logging in, you will be redirected to the dashboard where you can create complaints and view your submitted complaints.

## API Endpoints
- **POST /api/auth/register**: Register a new user.
- **POST /api/auth/login**: Log in an existing user.
- **GET /api/me**: Get the current user's information.
- **POST /api/complaints**: Create a new complaint.
- **GET /api/complaints/my**: Retrieve complaints submitted by the logged-in user.

## License
This project is licensed under the MIT License.