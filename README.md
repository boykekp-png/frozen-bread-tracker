# 🍞 Frozen Bread Tracker

A full-stack web application for tracking frozen bread expiration dates. This application helps users manage their frozen bread inventory by calculating expiration dates based on bread type and freeze date.

## Features

- **User Authentication**: Secure registration and login system with JWT tokens
- **Bread Type Management**: 10 pre-defined bread types with SKU numbers and expiration durations
- **Automatic Expiration Calculation**: Automatically calculates expiration date based on freeze date and bread type
- **CRUD Operations**: Create, read, update, and delete bread entries
- **Visual Indicators**: Color-coded entries for expired and expiring-soon breads
- **Responsive Design**: Works on desktop and mobile devices
- **Multi-User Support**: Each user's data is isolated and secure

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Authentication**: JWT (JSON Web Tokens) with bcrypt
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Styling**: Custom CSS with CSS Variables

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Installation

1. **Clone or download the project**
   ```bash
   cd frozen-bread-tracker
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment (optional)**
   - The `.env` file is already configured with default settings
   - You can modify `PORT`, `JWT_SECRET`, and `DB_PATH` if needed

4. **Start the server**
   ```bash
   cd backend
   npm start
   ```
   Or if you added a start script to package.json:
   ```bash
   npm start
   ```

5. **Access the application**
   - Open your browser and go to: `http://localhost:3000`
   - Register a new account or login

## Default Bread Types

The application comes pre-loaded with 8 bread types:

| SKU | Name | Expiration (Days) |
|-----|------|-------------------|
| 30010 | Donut | 5 |
| 26382 | Organic Whole Wheat | 6 |
| 38917 | Strawberry Sheetcake | 5 |
| 43424 | Ciabatta | 3 |
| 73267 | Baguette | 3 |
| 67873 | Half Moon Cake | 7 |
| 38473 | French Brioche | 14 |
| 90843 | Kringle | 4 |

## Usage

1. **Register/Login**: Create a new account with email and password
2. **Add Entry**: 
   - Select bread type from dropdown
   - Choose freeze date (defaults to today)
   - View calculated expiration date
   - Click "Add Entry"
3. **View Entries**: See all your bread entries in a table with:
   - Bread name and SKU
   - Freeze date and expiration date
   - Days remaining until expiration
   - Color coding (red = expired, yellow = expiring soon)
4. **Edit Entry**: Click "Edit" to modify an entry
5. **Delete Entry**: Click "Delete" to remove an entry

## Project Structure

```
frozen-bread-tracker/
├── backend/
│   ├── routes/
│   │   ├── auth.js          # Authentication endpoints
│   │   └── bread.js         # Bread CRUD endpoints
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── models/              # (Database models handled in routes)
│   ├── database.js          # SQLite database setup
│   ├── server.js            # Express server configuration
│   ├── .env                 # Environment variables
│   └── package.json
├── frontend/
│   ├── css/
│   │   └── style.css        # Main stylesheet
│   ├── js/
│   │   ├── auth.js          # Authentication logic
│   │   ├── api.js           # API communication
│   │   └── dashboard.js     # Dashboard functionality
│   ├── index.html           # Login/Register page
│   └── dashboard.html       # Main dashboard
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token

### Bread Management
- `GET /api/bread/types` - Get all bread types
- `GET /api/bread/entries` - Get user's bread entries
- `POST /api/bread/entries` - Create new entry
- `PUT /api/bread/entries/:id` - Update entry
- `DELETE /api/bread/entries/:id` - Delete entry

## Deployment

This application can be deployed to any server that supports Node.js:

1. **Heroku**: Deploy with a Procfile
2. **DigitalOcean**: Deploy as a systemd service
3. **AWS**: Deploy using EC2 or Elastic Beanstalk
4. **VPS**: Deploy with PM2 or similar process manager

Example PM2 deployment:
```bash
npm install -g pm2
cd backend
pm2 start server.js --name frozen-bread-tracker
pm2 startup
pm2 save
```

## Security Notes

- Passwords are hashed using bcrypt before storage
- JWT tokens expire after 24 hours
- All API endpoints (except public bread types) require authentication
- CORS is enabled for cross-origin requests

## License

MIT License

## Support

For issues or questions, please contact the developer.