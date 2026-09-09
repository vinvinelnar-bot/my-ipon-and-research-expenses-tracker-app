IPON CHALLENGE - RESEARCH EDITION

Features:
- Firebase Email/Password authentication
- Personal and Research account types chosen during Sign Up
- Personal savings dashboard with goal and savings history
- Research project information: product, title, budget, members
- Research expense tracker with category, amount, planned date, purchase date
- Purchased / not purchased status
- Optional deduction from savings when an expense is purchased
- Documentation photos stored in Firebase Storage
- Search, filter, category totals, budget remaining, and print report
- Admin dashboard with account type and research totals

FIREBASE SETUP
1. Keep your existing Firebase Authentication and Firestore setup.
2. In Firestore, publish firestore.rules.
3. In Firebase Storage, enable Storage, then publish storage.rules.
4. Keep your existing firebase-config.js values.
5. Existing admin document must remain: admins/{YOUR_UID} with role = "admin".

IMPORTANT
Research accounts are selected during Sign Up. Existing accounts without accountType are treated as Personal.
