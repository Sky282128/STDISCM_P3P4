Aldrin Hsu
Raine Margaux Siongco
Gabriel Alexander Villaflor
Gabriel Villas
STDISCM Section S03 & S04
P3: Networked Producer and Consumer
------------------------------------------------------------------
How to Build:
1. Install vcpkg (one time)
     cd C:\
     git clone https://github.com/microsoft/vcpkg
     C:\vcpkg\bootstrap-vcpkg.bat

2. Install the libraries (one time)
   Producer and consumer:
     C:\vcpkg\vcpkg install grpc:x64-windows
   Consumer only:
     C:\vcpkg\vcpkg install glfw3:x64-windows
     C:\vcpkg\vcpkg install opencv4[ffmpeg]:x64-windows ffmpeg:x64-windows sdl2:x64-windows pkgconf:x64-windows

3. Build the producer
     cd producer
     cmake -B build -DCMAKE_TOOLCHAIN_FILE=C:\vcpkg\scripts\buildsystems\vcpkg.cmake -DVCPKG_TARGET_TRIPLET=x64-windows
     cmake --build build --config Debug
     cd ..
   Result: producer\build\Debug\producer.exe

4. Build the consumer
     cd consumer
     cmake -B build -DCMAKE_TOOLCHAIN_FILE=C:\vcpkg\scripts\buildsystems\vcpkg.cmake -DVCPKG_TARGET_TRIPLET=x64-windows
     cmake --build build --config Debug
     cd ..
   Result: consumer\build\Debug\consumer.exe

How to Run:
Inputs
  p  number of producer threads        producer: --producers <n>   (default 1)
  c  number of consumer worker threads consumer: --consumers <n>   (default 2)
  q  maximum queue length              consumer: --queue <n>       (default 10)
  Other producer options:
     --address <host:port>   where the consumer is (default localhost:50051)
     --videos <folder>       root folder holding producer_1, producer_2, ... (default videos)
     --chunk-size <bytes>    bytes per gRPC message (default 1048576)
  The consumer always listens on port 50051.

1. Add test videos
   Create one folder per producer thread inside the producer's videos folder. 
   Folders must follow this naming convention: producer_N, with N from 1 up to the value of p.
   For example:
     <repo>\P3\producer\videos\producer_1\
     <repo>\P3\producer\videos\producer_2\
     <repo>\P3\producer\videos\producer_2\
   Only the following video file types are accepted: .mp4, .mkv, .avi, .mov and .webm files.
   Folders that do not follow the right naming convention and files that do not match the 
   accepted file types are ignored by the program.

2. Prepare a working folder for the consumer (outside the repo)
   The consumer saves uploads to an "uploads" folder inside the folder it is started from,
   and the Gallery reads "..\uploads", so the two are linked with a junction.
   Pick any empty folder outside the repo as <work-folder> (for example, a new folder in
   Downloads), then run:
     cd /d "<work-folder>"
     mkdir run\uploads
     mklink /J uploads "%CD%\run\uploads"
     cd run
   Keep the quotes if the path contains spaces. Start the consumer from this "run" folder.

3. Start the consumer first (command window 1, inside p3test\run)
     consumer\build\Debug\consumer.exe --consumers 2 --queue 10
   Keep this window open. Closing the consumer window stops the server.

   Note: 
   replace C with your desired number of consumer threads and
   replace Q with your desired value for max queue length

4. Start the producer (command window 2)
     cd producer
     build\Debug\producer.exe --producers P --videos videos --address localhost:50051

     Note: 
     replace P with your desired number of producer threads

   Producer and consumer on different machines:
     - use the consumer machine's IP address in --address, for example 192.168.1.50:50051
     - allow TCP port 50051 through the consumer machine's firewall

5. View the videos in the consumer window
     - click "Show Gallery" in the main window
     - hover over a video for a 10-second muted preview
     - click a video to play it with audio. You may also pause or stop the video playback.

6. Exit the GUI window to end the consumer run. Then, clean up between runs (close the consumer first):
     cd /d "%USERPROFILE%"
     rmdir "<work-folder>\uploads"
     rmdir /s /q "<work-folder>"
   Use the same <work-folder> as in step 2. The first rmdir removes only the junction, so the
   second command can't follow it into the saved videos. Recreate the folder with step 2
   before the next run.

Expected Outputs:
Producer console (2 producers, videos found in both folders)
  [Producer 1] Found 2 video(s) in videos\producer_1
  [Producer 1] Uploading videoname.mkv
  [Producer 1] Accepted videoname.mkv
  [Producer 2] Found 3 video(s) in videos\producer_2
  ...
  ---------------- Summary ----------------
  Producer 1: found=2 accepted=2 dropped=0 duplicates=0 failed=0 sent=41.90 MB
  Producer 2: found=3 accepted=3 dropped=0 duplicates=0 failed=0 sent=46.87 MB
  Total: found=5 accepted=5 dropped=0 duplicates=0 failed=0 sent=88.77 MB

  Per-file results:
    Accepted                 the consumer queued the video
    Dropped (queue full)     the queue was full, the video was discarded and is not resent
    Failed to upload         the consumer was unreachable or the connection broke
  found = accepted + dropped + duplicates + failed
  A producer whose folder is missing or empty logs "No videos found" and finishes;
  the other producers are not affected.

Consumer console
  Consumers: 2, queue capacity: 10
  Server listening on 0.0.0.0:50051
  [Server] Receiving file: Hatty Game.mkv from Producer ID: 1 (41345176 bytes)
  [Server] Finished receiving Hatty Game.mkv. Bytes received: 41345176
  [Worker] Saved uploads\producer_1_Hatty Game.mkv
  Uploads from different producers overlap, and each "Bytes received" figure matches
  the size announced for that file. OpenCV INFO lines about missing plugin DLLs are
  normal and can be ignored.

Saved files
  Each accepted video is saved as producer_<id>_<original name> in the uploads folder.
  Dropped uploads are deleted and never appear in the folder or the Gallery.

Consumer GUI
  A main window with a "Show Gallery" button. The Gallery window shows
  "Uploaded Videos: N" and lists the saved videos. New uploads appear without a refresh.
  Hovering plays a 10-second muted preview, clicking plays the video with audio.

Exit codes
  producer: 0 = no failures (drops and duplicates are not failures), 1 = at least one
            upload failed, 2 = invalid arguments
  consumer: 0 = normal exit, 2 = invalid arguments

Invalid input
  Values such as --producers 0, --consumers 0 or --queue abc are rejected with an error
  message and the usage text, and the program exits without starting.