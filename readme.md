# fit-app: Εφαρμογή Κράτησης για Εκπαιδευτές/Χρήστες

Αυτό το αποθετήριο περιέχει μια πλήρη εφαρμογή κράτησης (booking) με:
- **Frontend**: React (CRA) χρησιμοποιώντας τον Supabase JavaScript client (anon κλειδί)
- **Backend**: Node.js + Express, μερικά προστατευμένα endpoints που χρησιμοποιούν το Supabase service‐role κλειδί
- **Βάση δεδομένων & Αυθεντικοποίηση**: Supabase (PostgreSQL + Auth + Storage + RLS)

Στο fit-app υπάρχουν δύο ρόλοι:
1. **Χρήστης**: μπορεί να περιηγηθεί στις υπηρεσίες εκπαιδευτών, να κλείσει διαθέσιμες ώρες, να επεξεργαστεί το δικό του προφίλ/avatαρ.  
2. **Εκπαιδευτής**: πρέπει να ανεβάσει τουλάχιστον ένα δίπλωμα/πιστοποιητικό ώστε να αποκτήσει τη δυνατότητα να δημοσιεύει υπηρεσίες∙ μετά από αυτό μπορεί να διαχειρίζεται υπηρεσίες (τίτλος, περιγραφή, τιμή, ετικέτες, πρόσθετες υπηρεσίες, διαθεσιμότητα). Έχει επίσης avatar και προφίλ που μπορεί να επεξεργαστεί.

Παρακάτω περιγράφεται το πώς στήνεται, τρέχει και λειτουργεί αυτό το έργο.

---

## Πίνακας Περιεχομένων

1. [Απαιτούμενα Εργαλεία](#απαιτούμενα-εργαλεία)  
2. [Διαμόρφωση Supabase](#διαμόρφωση-supabase)  
   2.1. [Δημιουργία Έργου στο Supabase](#δημιουργία-έργου-στο-supabase)  
   2.2. [Ενεργοποίηση Authentication & Πίνακας Προφίλ](#ενεργοποίηση-authentication--πίνακας-προφίλ)  
   2.3. [Δημιουργία Σχήματος Βάσης & Πολιτικές RLS](#δημιουργία-σχήματος-βάσης--πολιτικές-rls)  
   2.4. [Κουβάδες (Buckets) Αποθήκευσης](#κουβάδες-buckets-αποθήκευσης)  
3. [Διαμόρφωση Backend (Express)](#διαμόρφωση-backend-express)  
   3.1. [Μεταβλητές Περιβάλλοντος (Backend)](#μεταβλητές-περιβάλλοντος-backend)  
   3.2. [Εγκατάσταση Εξαρτήσεων (Backend)](#εγκατάσταση-εξαρτήσεων-backend)  
   3.3. [Εκκίνηση Backend Server](#εκκίνηση-backend-server)  
4. [Διαμόρφωση Frontend (React)](#διαμόρφωση-frontend-react)  
   4.1. [Μεταβλητές Περιβάλλοντος (Frontend)](#μεταβλητές-περιβάλλοντος-frontend)  
   4.2. [Εγκατάσταση Εξαρτήσεων (Frontend)](#εγκατάσταση-εξαρτήσεων-frontend)  
   4.3. [Εκκίνηση Frontend](#εκκίνηση-frontend)  
5. [Δομή Έργου](#δομή-έργου)  
6. [Χρήση & Δυνατότητες](#χρήση--δυνατότητες)  
   6.1. [Ροή Αυθεντικοποίησης](#ροή-αυθεντικοποίησης)  
   6.2. [Πίνακας Εκπαιδευτή](#πίνακας-εκπαιδευτή)  
   6.3. [Διαχείριση Υπηρεσιών & Διαθεσιμότητας](#διαχείριση-υπηρεσιών--διαθεσιμότητας)  
   6.4. [Marketplace & Κράτηση](#marketplace--κράτηση)  
   6.5. [Διαχείριση Προφίλ & Avatar](#διαχείριση-προφίλ--avatar)  
7. [Αναφορά Μεταβλητών Περιβάλλοντος](#αναφορά-μεταβλητών-περιβάλλοντος)  
8. [SQL Snippets & Πολιτικές RLS](#sql-snippets--πολιτικές-rls)  
9. [Αντιμετώπιση Προβλημάτων](#αντιμετώπιση-προβλημάτων)

---

## Απαιτούμενα Εργαλεία

- Node.js ≥ 16.x (LTS συνιστάται)  
- npm (ή Yarn)  
- Ένας λογαριασμός Supabase & Έργο  
- Git (για κλωνοποίηση του αποθετηρίου)  
- (Προαιρετικό) [Postman](https://www.postman.com/) για δοκιμή των API endpoints

---

## Διαμόρφωση Supabase

### Δημιουργία Έργου στο Supabase

1. Συνδεθείτε στο [Supabase](https://app.supabase.com) και δημιουργήστε νέο έργο.  
2. Σημειώστε:
   - **Project URL** (π.χ. `https://xyzabc.supabase.co`)
   - **Anon/Public API Key** (χρησιμοποιείται από το frontend)
   - **Service Role (secret) Key** (χρησιμοποιείται από το backend)

### Ενεργοποίηση Authentication & Πίνακας Προφίλ

1. Στο Supabase Dashboard, μεταβείτε στο **Authentication → Settings → External OAuth Providers** (προαιρετικά).  
2. Επιλέξτε, αν θέλετε, να ενεργοποιήσετε “Enable email confirmations” ώστε οι χρήστες να επιβεβαιώνουν το email τους.

3. Μεταβείτε στο **Table Editor → New Table** και δημιουργήστε τον πίνακα `profiles`:
   - **Table Name**: `profiles`
   - **Columns**:
     - `id` (UUID, PRIMARY KEY) — foreign key που αναφέρεται σε `auth.users.id`.
     - `full_name` (text)
     - `role` (text) — τιμές: `user` ή `trainer`.
     - `avatar_url` (text, nullable)
     - `diploma_url` (text, nullable)
     - `bio` (text, nullable)
     - `specialty` (text, nullable)
     - `phone` (text, nullable)
     - `created_at` (timestamp with time zone, default `now()`)
   - Στις **Relationships**, συνδέστε `profiles.id` → `auth.users.id`.

4. Στο **Authentication → Policies**, βεβαιωθείτε ότι νέοι χρήστες δεν μπορεί να βλέπουν ή να τροποποιούν άλλους χρήστες από προεπιλογή.

### Δημιουργία Σχήματος Βάσης & Πολιτικές RLS

Ανοίξτε **SQL Editor** στο Supabase και εκτελέστε το παρακάτω SQL για να δημιουργήσετε επιπλέον πίνακες και να ορίσετε τις πολιτικές RLS (Row Level Security). Αντικαταστήστε ονόματα πινάκων/στηλών αν έχετε διαφορετική ονοματολογία.

```sql
-- ─────────────────────────────────────
-- 1) Ενεργοποίηση RLS στον πίνακα profiles
-- ─────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Επιτρέπεται σε κάθε χρήστη να επιλέγει (SELECT) μόνο το δικό του προφίλ
DROP POLICY IF EXISTS allow_select_own_profile ON public.profiles;
CREATE POLICY allow_select_own_profile
  ON public.profiles
  FOR SELECT
  USING ( id = auth.uid()::uuid );

-- Επιτρέπεται σε κάθε χρήστη να ενημερώνει (UPDATE) μόνο το δικό του προφίλ
DROP POLICY IF EXISTS allow_update_own_profile ON public.profiles;
CREATE POLICY allow_update_own_profile
  ON public.profiles
  FOR UPDATE
  USING     ( id = auth.uid()::uuid )
  WITH CHECK ( id = auth.uid()::uuid );

-- ─────────────────────────────────────
-- 2) Δημιουργία πινάκων services, service_extras, service_slots, bookings
-- ─────────────────────────────────────

-- SERVICES TABLE
CREATE TABLE IF NOT EXISTS public.services (
  id            uuid             PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id    uuid             NOT NULL REFERENCES public.profiles(id),
  title         text             NOT NULL,
  descr         text             NOT NULL,
  price         numeric           NOT NULL,
  tags          text[]           NOT NULL DEFAULT ARRAY[]::text[],
  is_virtual    boolean          NOT NULL DEFAULT false,
  image_url     text,
  created_at    timestamp with time zone DEFAULT now()
);

-- EXTRAS TABLE
CREATE TABLE IF NOT EXISTS public.service_extras (
  id         uuid   PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id uuid   NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  title      text   NOT NULL,
  price      numeric NOT NULL
);

-- SLOTS TABLE
CREATE TABLE IF NOT EXISTS public.service_slots (
  id               uuid   PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id       uuid   NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  starts_at        timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  booked           boolean       NOT NULL DEFAULT false
);

-- BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
  id          uuid   PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id  uuid   NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  user_id     uuid   NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_id     uuid   NOT NULL REFERENCES public.service_slots(id) ON DELETE CASCADE,
  created_at  timestamp with time zone DEFAULT now(),
  UNIQUE (slot_id)  -- ένα slot μπορεί να κλειστεί μόνο μία φορά
);

-- ─────────────────────────────────────
-- 3) Ενεργοποίηση RLS & Πολιτικές σε services, service_extras, service_slots, bookings
-- ─────────────────────────────────────

-- SERVICES RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_trainer_crud_own_service ON public.services;
CREATE POLICY allow_trainer_crud_own_service
  ON public.services
  FOR ALL
  USING ( trainer_id = auth.uid()::uuid )
  WITH CHECK ( trainer_id = auth.uid()::uuid );

-- EXTRAS RLS
ALTER TABLE public.service_extras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_trainer_manage_extras ON public.service_extras;
CREATE POLICY allow_trainer_manage_extras
  ON public.service_extras
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_extras.service_id
        AND s.trainer_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_extras.service_id
        AND s.trainer_id = auth.uid()::uuid
    )
  );

-- SLOTS RLS
ALTER TABLE public.service_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_trainer_manage_slots ON public.service_slots;
CREATE POLICY allow_trainer_manage_slots
  ON public.service_slots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_slots.service_id
        AND s.trainer_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_slots.service_id
        AND s.trainer_id = auth.uid()::uuid
    )
  );

-- BOOKINGS RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_user_manage_own_booking ON public.bookings;
CREATE POLICY allow_user_manage_own_booking
  ON public.bookings
  FOR ALL
  USING (
    user_id = auth.uid()::uuid
    OR EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = bookings.service_id
        AND s.trainer_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    user_id = auth.uid()::uuid
    OR EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = bookings.service_id
        AND s.trainer_id = auth.uid()::uuid
    )
  );

Διαμόρφωση Backend (Express)
1) Μεταβλητές Περιβάλλοντος (backend/.env)
Δημιουργήστε ένα αρχείο backend/.env με περιεχόμενο:

dotenv


SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-secret-key>
PORT=5000
SUPABASE_URL: το URL του έργου Supabase (βρίσκεται στο Supabase → Settings → API).

SUPABASE_ANON_KEY: το anon/public API key (Supabase → Settings → API).

SUPABASE_SERVICE_ROLE_KEY: το service role (secret) key (Supabase → Settings → API → Show “Service key”).

PORT: προαιρετικό (προεπιλογή 5000).

2) Εγκατάσταση Εξαρτήσεων
bash


cd backend
npm install
Οι κύριες εξαρτήσεις είναι:

express

cors

@supabase/supabase-js

dotenv

3) Εκκίνηση Backend Server
bash


npm run dev
Αυτό τρέχει:

bash


nodemon index.js
Ο server ακούει στον http://localhost:5000 (ή όποιον PORT έχετε ορίσει).
Κύρια endpoints:

POST /api/signup
Δημιουργεί νέο χρήστη (στο auth.users) και μια αντίστοιχη σειρά στον profiles (χρησιμοποιώντας το service‐role κλειδί).

GET /api/profile
Επιστρέφει { role, full_name, avatar_url, diploma_url, bio, specialty, phone } του χρήστη που είναι συνδεδεμένος (RLS μέσω anon client).

GET /api/trainer/secret
Επιστρέφει { message: "🎉 trainer-only data" } μόνο αν profile.role === "trainer".

POST /api/update-diploma
Ενημερώνει το profiles.diploma_url χρησιμοποιώντας το service‐role κλειδί (παρακάμπτει RLS).

Διαμόρφωση Frontend (React)
1) Μεταβλητές Περιβάλλοντος (frontend/.env)
Δημιουργήστε ένα αρχείο frontend/.env με περιεχόμενο:

dotenv


REACT_APP_SUPABASE_URL=https://<project-ref>.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<anon-public-key>
Προσοχή: Δεν πρέπει να εκθέσετε ποτέ το service‐role key στο frontend.

2) Εγκατάσταση Εξαρτήσεων
bash


cd frontend
npm install
Οι κύριες εξαρτήσεις είναι:

react

react-router-dom

@supabase/supabase-js

concurrently (αν χρησιμοποιείτε ένα κοινό npm run dev script)

3) Εκκίνηση Frontend
bash


npm start
Το CRA συνήθως τρέχει στο http://localhost:3000. Αν έχετε ρυθμίσει "proxy": "http://localhost:5000" στο package.json, τα calls στο /api/... θα προωθούνται στον Express backend.

Δομή Έργου
java


my-app/
├── backend/
│   ├── index.js
│   ├── supabaseClient.js
│   ├── authMiddleware.js
│   ├── package.json
│   ├── .env
│   └── ...
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AvatarUpload.js
│   │   │   ├── ChangePasswordForm.js
│   │   │   ├── EditProfileForm.js
│   │   │   ├── UserMenu.js (και TrainerMenu.js)
│   │   │   ├── ServiceImageUpload.js
│   │   │   └── SlotCalendarManager.js
│   │   │
│   │   ├── pages/
│   │   │   ├── AuthPage.js
│   │   │   ├── ForgotPasswordPage.js
│   │   │   ├── ResetPasswordPage.js
│   │   │   ├── TrainerDashboard.js
│   │   │   ├── TrainerServicesPage.js
│   │   │   ├── ServicesMarketplacePage.js
│   │   │   ├── ServiceDetailPage.js
│   │   │   └── UserDashboard.js
│   │   │
│   │   ├── utils/
│   │   │   ├── avatar.js
│   │   │   └── placeholderServiceImg.js
│   │   │
│   │   ├── AuthProvider.js
│   │   ├── supabaseClient.js
│   │   ├── App.js
│   │   └── index.js
│   │
│   ├── .env
│   ├── package.json
│   └── ...
│
└── README.md
Χρήση & Δυνατότητες
1. Ροή Αυθεντικοποίησης
AuthPage (/): Έντυπο “Σύνδεση” ή “Εγγραφή” με toggle.

Στην Εγγραφή, καλεί supabase.auth.signUp(), και μετά αποθηκεύει το profiles μέσω backend ή άμεσα (upsert).

Στη Σύνδεση, καλεί supabase.auth.signInWithPassword().

Μετά τη σύνδεση, η AuthProvider φορτώνει session και profile.

Το ProtectedRoute (στο App.js) ελέγχει session και profile.role. Ανακατευθύνει σε /user ή /trainer ανάλογα με το ρόλο.

2. Πίνακας Εκπαιδευτή (/trainer)
Εμφανίζει:

Avatar του εκπαιδευτή (με κουμπί διαγραφής)

Role: trainer

Προστατευμένο μήνυμα από /api/trainer/secret

Απαίτηση Διπλώματος:

Αν profile.diploma_url === null, εμφανίζει κόκκινη ειδοποίηση “Ανεβάστε δίπλωμα πρώτα.”

Input αρχείου → ανεβάζει στο diplomas/{uid}/… → ενημερώνει profiles.diploma_url μέσω RLS (ή backend) → επαναφορτώνει/επαναφέρεται το προφίλ.

Μόλις οριστεί diploma_url, ξεκλειδώνει το “My services” στο μενού.

3. Διαχείριση Υπηρεσιών & Διαθεσιμότητας (/trainer/services)
TrainerServicesPage:

Λίστα όλων των υπηρεσιών του συγκεκριμένου εκπαιδευτή (RLS αναγκάζει trainer_id = auth.uid()).

Φόρμα Δημιουργίας Υπηρεσίας:

Τίτλος / Περιγραφή / Τιμή / Ετικέτες / Checkbox Virtual

Φόρτωση εικόνας (στο service-images bucket)

Προσθήκη “Extras” (τίτλος + τιμή)

Προσθήκη χρονοθυρίδων (slots) μέσω SlotCalendarManager

Κάθε υπάρχουσα υπηρεσία:

Προβολή εικόνας καλύμματος (ή placeholder) + επιλογή αρχείου για αλλαγή

Κουμπί “Διαγραφή Υπηρεσίας”

Λίστα Extras (μπορείτε να διαγράψετε ή να προσθέσετε νέα)

Λίστα Slots (διαγραφή, αλλαγή διάρκειας, εμφάνιση “(booked)” αν έχει κλειστεί)

4. Marketplace & Κράτηση (/services)
ServicesMarketplacePage:

Λίστα όλων των υπηρεσιών (supabasePublic → χωρίς φιλτράρισμα κατά trainer_id).

Για κάθε κάρτα υπηρεσίας:

Εικόνα (ή placeholder)

Τίτλος, Τιμή, ένδειξη Virtual

Όνομα Εκπαιδευτή (μέσω trainer:profiles(full_name))

Περιγραφή, Ετικέτες

Λίστα Extras (τίτλος + τιμή)

Dropdown από διαθέσιμα slots (booked = false)

Κουμπί “Book”:

INSERT INTO bookings { service_id, user_id, slot_id }

UPDATE service_slots SET booked = true
(Και τα δύο επιτρέπονται από RLS: user_id = auth.uid())

Σε επιτυχία, ενημερώνει άμεσα την κάρτα (slots) οπτικά.

ServiceDetailPage (/service/:id):

Μεγάλη εικόνα κάλυψης, τίτλος, τιμή, ένδειξη Virtual, ετικέτες, περιγραφή.

“Uploaded by” μπλοκ:

Avatar (ή placeholder), ονοματεπώνυμο, ειδικότητα, βιογραφικό, τηλέφωνο, ημερομηνία εγγραφής.

Ημερολόγιο κράτησης (ομαδοποιημένα slots ανά ημέρα):

Εμφανίζει κουμπιά με ώρα για κάθε διαθέσιμο slot.

Κουμπί “Book now” που κλείνει το επιλεγμένο slot.

Αν δεν υπάρχουν διαθέσιμα slots, εμφανίζει “Λυπούμαστε, δεν υπάρχουν διαθέσιμα slots αυτή τη στιγμή.”

5. Διαχείριση Προφίλ & Avatar
AvatarUpload Component:

Ο χρήστης/εκπαιδευτής μπορεί να επιλέξει νέο αρχείο avatar → ανεβάζει στο avatars/{uid}/… bucket → ενημερώνει profiles.avatar_url μέσω RLS.

Αν avatar_url υπάρχει, εμφανίζει “Διαγραφή avatar” για τη διαγραφή μέσω RLS.

EditProfileForm:

Ενημερώνει τα πεδία full_name, phone, specialty, bio στον πίνακα profiles μέσω RLS.

ChangePasswordForm:

Καλεί supabase.auth.updateUser({ password: newPassword }).

Forgot/Reset Password:

ForgotPasswordPage: καλεί supabase.auth.resetPasswordForEmail(email) → στέλνει link επαναφοράς.

ResetPasswordPage: για το URL επαναφοράς, καλεί supabase.auth.updateUser({ password }).

Αναφορά Μεταβλητών Περιβάλλοντος
Backend (.env)

dotenv


SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
PORT=5000           # προαιρετικό, προεπιλογή 5000
Frontend (.env)

dotenv


REACT_APP_SUPABASE_URL=https://<project-ref>.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<anon-public-key>
Σημείωση: Μην ανεβάσετε ποτέ το SUPABASE_SERVICE_ROLE_KEY σε δημόσιο αποθετήριο.

SQL Snippets & Πολιτικές RLS
Μπορείτε να αντιγράψετε/επικολλήσετε τα παρακάτω στο Supabase SQL editor:

sql


-- Ενεργοποίηση RLS στον πίνακα profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Πολιτικές για τον πίνακα profiles
DROP POLICY IF EXISTS allow_select_own_profile ON public.profiles;
CREATE POLICY allow_select_own_profile
  ON public.profiles
  FOR SELECT
  USING ( id = auth.uid()::uuid );

DROP POLICY IF EXISTS allow_update_own_profile ON public.profiles;
CREATE POLICY allow_update_own_profile
  ON public.profiles
  FOR UPDATE
  USING     ( id = auth.uid()::uuid )
  WITH CHECK ( id = auth.uid()::uuid );

-- Δημιουργία πινάκων services, service_extras, service_slots, bookings (όπως στο README)

-- Ενεργοποίηση RLS & Πολιτικές για services, service_extras, service_slots, bookings (όπως στο README)

-- Ενεργοποίηση RLS στον πίνακα storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Πολιτικές για τον κουβά avatars
DROP POLICY IF EXISTS policy_avatar_insert ON storage.objects;
CREATE POLICY policy_avatar_insert
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS policy_avatar_update ON storage.objects;
CREATE POLICY policy_avatar_update
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Πολιτικές για τον κουβά diplomas
DROP POLICY IF EXISTS policy_diploma_insert ON storage.objects;
CREATE POLICY policy_diploma_insert
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'diplomas'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS policy_diploma_update ON storage.objects;
CREATE POLICY policy_diploma_update
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'diplomas'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
Αντιμετώπιση Προβλημάτων
“new row violates row-level security policy”
→ Βεβαιωθείτε ότι έχετε εκτελέσει τις πολιτικές RLS παραπάνω. Χωρίς αυτές, οποιαδήποτε UPDATE profiles … ή UPDATE bookings … θα αποκλείεται.

“Bucket not found” / “Cannot upload to storage”
→ Βεβαιωθείτε ότι έχετε δημιουργήσει τον κουβά avatars (για avatars) ή diplomas (για diplomas) στο Supabase → Storage, και έχει ρυθμιστεί ως Public.

“Cannot read properties of null (reading 'role')”
→ Σημαίνει ότι η AuthProvider δεν έχει φορτώσει ακόμα το profile. Βεβαιωθείτε ότι το React περιμένει το loading να γίνει false πριν προσπελάσει το profile.role.

“react-scripts not recognized” όταν τρέχετε npm start στο frontend
→ Βεβαιωθείτε ότι έχετε τρέξει npm install στο /frontend.
→ Ελέγξτε το package.json ότι περιέχει:




{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}
“User not allowed” στο backend όταν προσπαθεί να δημιουργήσει χρήστη
→ Βεβαιωθείτε ότι το backend χρησιμοποιεί όντως το supabaseAdmin.auth.admin.createUser(…). Ελέγξτε ότι το SUPABASE_SERVICE_ROLE_KEY είναι σωστό.

“Cannot read property ‘role’ of null” σε JSX
→ Βεβαιωθείτε ότι έχετε if (profile) ή ελέγχετε πρώτα το loading πριν χρησιμοποιήσετε το profile.role.