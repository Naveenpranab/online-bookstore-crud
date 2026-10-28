# PageTurner — Online Bookstore CRUD App

A responsive bookstore admin dashboard built with HTML, CSS, Bootstrap, vanilla JavaScript, Node.js, Express, and MongoDB. Includes book CRUD, searchable inventory, order creation, stock adjustment, and order status updates.

## Requirements
- Node.js 18+
- MongoDB database (MongoDB Atlas free cluster works)

## Run locally
1. Create a MongoDB Atlas cluster and database user. In Network Access, allow your development IP address. For a temporary class demo, you may allow `0.0.0.0/0`, but use a strong database password and never commit credentials.
2. Copy `.env.example` to `.env` and replace `MONGODB_URI` with your MongoDB connection string.
3. In this directory run:
   ```bash
   npm install
   npm start
   ```
4. Open `http://localhost:3000`.

## API routes
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/books` | List books; optional `?search=term` |
| POST | `/api/books` | Add a book |
| PUT | `/api/books/:id` | Update a book |
| DELETE | `/api/books/:id` | Delete a book (blocked if active orders exist) |
| GET | `/api/orders` | List customer orders |
| POST | `/api/orders` | Create an order and reduce stock |
| PATCH | `/api/orders/:id/status` | Update status; cancelling restores stock |
| GET | `/api/health` | Basic health/database status |

## Deploy to Render with GitHub integration
1. Create a GitHub repository, for example `online-bookstore-crud`.
2. Extract this project, open a terminal in the project directory, then run:
   ```bash
   git init
   git add .
   git commit -m "Build online bookstore CRUD app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/online-bookstore-crud.git
   git push -u origin main
   ```
   Create the empty repository on GitHub first and replace `YOUR_USERNAME` with your GitHub username.
3. Create a MongoDB Atlas database. Add a database user and configure Network Access. Copy the connection URI; replace the password placeholder and URL-encode special characters in the password.
4. Sign in to Render, choose **New → Web Service**, connect GitHub, and select this repository.
5. Configure:
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
6. Under Environment Variables, add `MONGODB_URI` with your Atlas connection string. Render supplies `PORT` automatically; the app uses it.
7. Deploy. Open the Render URL and test adding a book and creating an order.
8. Enable automatic deploys from the `main` branch if prompted. Future pushes to GitHub can trigger a new deployment.

## Notes
- Never commit `.env` or database credentials. `.gitignore` excludes `.env` and `node_modules`.
- This is a learning/demo admin application, not a production-ready public storefront. Before production, add authentication/authorization, CSRF protections where applicable, rate limiting, stronger input validation, audit logging, transactional stock updates, and secure customer-data handling.
- Bootstrap is loaded from a CDN, so an internet connection is required for its styles and modal behavior.
