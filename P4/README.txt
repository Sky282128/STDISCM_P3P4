Aldrin Hsu
Raine Margaux Siongco
Gabriel Alexander Villaflor
Gabriel Villas
STDISCM Section S03 & S04
P4: Distributed Fault Tolerance
------------------------------------------------------------------
Requirements:
  - Windows with Docker Desktop installed
  No local Python, Node.js or MySQL installation is needed. Every part of the system runs
  in its own container.

Services (defined in compose.yaml):
  Service                 Role                                  Port
  frontend                Web app (View node, Next.js)          3000
  login-register-service  Authentication node                   50051
  courses-service         Courses node                          50052
  enrollment-service      Enrollment node                       50053
  grades-service          Grades node                           50054
  MySQL (mysql:8.4)       Database used by the backend nodes    3306 (inside Docker)
  The backend nodes communicate through gRPC.

How to Build:
1. Create the environment file (one time)
   The database settings are kept in a file named .env. If a file with that name is already
   in the P4 folder next to compose.yaml, skip this step.
   Otherwise, create it inside the P4 folder, in the same folder as compose.yaml, with
   these four keys:
     MYSQL_ROOT_PASSWORD=your_root_password
     MYSQL_DATABASE=user_info
     MYSQL_USER=your_mysql_user
     MYSQL_PASSWORD=your_mysql_password
   Replace the values after "=" with your own. Keep MYSQL_DATABASE as user_info.
   The file name must be exactly ".env" with nothing before the dot and no .txt extension.
   If you use Notepad, set "Save as type" to "All files" when saving.

2. Start Docker Desktop
   Wait until Docker Desktop reports that it is running.

3. Build and start all services (command window, inside the P4 folder)
     docker compose up -d --build
   The first build downloads the base images (mysql:8.4, python:3.12-slim, node:24-alpine)
   and installs the dependencies, so it can take several minutes. Later runs are faster.
   Add --build again only after the code or a Dockerfile changes.

How to Run:
1. Check that every service is running
     docker compose ps

2. Open the web app in a browser
     http://localhost:3000
   Register an account (student or teacher) and log in.

3. Simulate a node failure (fault tolerance)
   Stop one node:
     docker compose stop courses-service
   Reload the web app. Only the features that depend on that node stop working, and the
   rest of the application keeps working. Bring the node back:
     docker compose start courses-service
   The same commands work for login-register-service, enrollment-service and
   grades-service. Run "docker compose ps" to see every service name.

4. View the log of one service
     docker compose logs --tail 50 courses-service

5. End the run (inside the P4 folder)
     docker compose down
   This stops and removes the containers. To also erase the saved database data and start
   fresh next time, use:
     docker compose down -v

Expected Outputs:
Container status ("docker compose ps")
  Every service listed above is shown with a status of "Up" (or "running").

Node logs ("docker compose logs --tail 50 <service>")
  login-register-service   gRPC server listening on port 50051...
  courses-service          courses node listening on port 50052
  enrollment-service       enrollment node listening on port 50053
  grades-service           Grades Node listening on port 50054

Web app
  http://localhost:3000 shows the login page of the enrollment system.

After stopping a node
  The features that belong to the stopped node stop working while the other nodes and the
  web app continue to run. They recover after "docker compose start <service>".