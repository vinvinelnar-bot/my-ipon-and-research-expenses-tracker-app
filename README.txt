IPON CHALLENGE - FIREBASE WEBSITE

Included:
- Landing page
- Sign up / Login with Firebase Authentication
- Personal savings dashboard
- Savings history
- Savings goal
- Secure admin panel
- Admin can see registered users, email, total savings, goal, last login, and registration date

FIREBASE SETUP
1. Open your Firebase project.
2. Authentication > Sign-in method > Email/Password must be Enabled.
3. Firestore Database must be created.
4. Replace the Firebase config in firebase-config.js with your Web App config.
5. In Firestore > Rules, paste the contents of firestore.rules and Publish.

MAKE YOUR ACCOUNT AN ADMIN
1. Open Firebase Console > Authentication > Users.
2. Find the account that you want to use as admin.
3. Copy that account's User UID.
4. Open Firestore Database > Data.
5. Click Start collection.
6. Collection ID: admins
7. Document ID: paste the admin account's User UID.
8. Add a field:
   role = admin
9. Save.

IMPORTANT:
- Do NOT create an admin role using the user's email alone.
- Do NOT put a Firebase service-account/private key in the website.
- The admin button will appear on the dashboard only for the account whose UID is listed in admins with role=admin.

HOW IT WORKS
- Every signup creates a document in users/{uid}.
- Every successful login updates lastLoginAt.
- Admin page reads the users collection only after Firebase verifies that the current UID has an admins/{uid} document with role=admin.
- Normal users can only read/write their own profile and savings.

RUN
Use VS Code Live Server. Open index.html through Live Server, not by double-clicking the file.
