# Manual verification (run on your own computer)

The author's environment could not install npm packages or reach MongoDB, so these steps have **not** been run yet. Please run them and send back any error text.

## 1. Prerequisites
- Node.js 20.10 or newer: `node -v`
- A MongoDB database. Either:
  - **Local:** MongoDB Community Server running on the default port, or
  - **Atlas (free):** create a cluster, add a database user, allow your IP under Network Access, and copy the connection string.

## 2. Configure
From the project root:
```bash
copy .env.example server\.env      # Windows
cp .env.example server/.env        # macOS / Linux
```
Edit `server/.env`:
- `MONGODB_URI` - your connection string ending in `/campusgig`.
- `MONGODB_URI_TEST` - the **same server but a different database name** ending in `/campusgig_test`.
- `JWT_SECRET` - output of `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

## 3. Server
```bash
cd server
npm install
npm test
npm run lint
npm run seed
npm run dev
```
Expected:
- `npm test`: `# tests 246`, `# pass 246`, `# fail 0`.
- `npm run lint`: no output (no errors).
- `npm run seed`: "Seed complete" followed by the demo accounts.
- `npm run dev`: "CampusGig API running on http://localhost:5000". Opening http://localhost:5000/api/health shows `{"success":true,"data":{"status":"ok"}}`.

## 4. Client (second terminal)
```bash
cd client
npm install
npm run lint
npm run build
npm run dev
```
Expected: lint clean, build ends with "built in ...", and the app opens at http://localhost:5173.

## 5. Manual checklist
1. Home page loads with no console errors; "How it works" opens the About page.
2. Register a student: wrong inputs show messages under the fields; a valid form lands on the student dashboard.
3. Log out, then register again with the same email: the email field shows "already exists".
4. Log in as `nusrat.jahan@campusgig.demo`: dashboard shows completeness 100%.
5. Log in as `farhana.akter@campusgig.demo`: dashboard shows 50% and lists three missing items (location, introduction, experience); "Complete your profile" opens the form.
6. Edit the profile: add skills with Enter, save, see the success message, and see the dashboard percentage update.
7. Log in as a poster: change "You are hiring as" to Business and confirm the organization name field appears; save.
8. While logged in as a student, type `/admin` in the address bar: you are sent back to the student dashboard.
9. Log in as `admin@campusgig.demo`: the admin dashboard shows total users 7, students 3, posters 3.
10. Refresh the page on any dashboard: you stay logged in.
11. In the browser dev tools, edit or delete the saved `campusgig_token`, then reload: you are sent to the login page.
12. Resize the window (or use device mode) to phone width: no horizontal page scroll, navigation still usable.

## 5b. Job marketplace checklist (Increment 3)
13. While logged out, open "Browse jobs" from the top navigation: 5 open demo jobs should appear (the 6th demo job is closed and should NOT appear here).
14. Search for "React": only the "Landing Page for a Small Design Studio" job should appear.
15. Filter by category "Event Staffing": only the tree-planting job should appear. Clear the filter.
16. Sort by "Budget: high to low": the highest-budget job should be first.
17. Click a job card to open its details page; confirm budget, duration, deadline, description, skills, and "Posted by ..." all display correctly.
18. Log in as `sadia.rahman@campusgig.demo` (a poster) and go to "My jobs": both of her jobs should be listed, with correct statuses.
19. Click "Post a job", fill the form, and submit: you should land on the new job's details page, and it should now appear in "My jobs" and in Browse Jobs (if you are logged out or viewing as someone else).
20. On one of your own OPEN jobs' details page, click "Edit", change the budget, save, and confirm the change appears.
21. On the same job, click "Close job" (confirm the browser prompt): status should change to "Closed", and Edit/Delete buttons should disappear.
22. Try to open `/poster/jobs/<that-job-id>/edit` directly in the address bar for the now-closed job: it should show a message that the job can no longer be edited, not a broken form.

## 5c. Applications checklist (Increment 4)
23. Log in as `tanvir.ahmed@campusgig.demo` (student), open a job from Browse jobs, click "Apply for this job", write a message and submit: you land on "My applications" with status Pending.
24. Open the same job again and try to apply a second time through the URL `/jobs/<id>/apply`: the server refuses with "You have already applied to this job."
25. Log in as `nusrat.jahan@campusgig.demo` and apply to the same job.
26. Log in as the poster who owns that job, open "My jobs", click "Applicants" on the job: both applications appear.
27. Shortlist one applicant: the badge changes to Shortlisted.
28. Accept the other applicant (confirm the prompt): the accepted one shows Accepted, the shortlisted one becomes Rejected, and the job details page shows In progress.
29. As the accepted student, open "My applications" and click Withdraw (confirm): the application becomes Withdrawn and the job returns to Open.
30. Try to delete a job that has applications: it is refused. Cancel an in-progress job: the accepted application shows Withdrawn.

## 5d. Completion, reviews, messaging, reports (Increment 5)
Run `npm run seed` first (it now also clears applications, reviews, messages, and reports).
31. As `sadia.rahman@campusgig.demo` (poster) open "Instagram Post Designs...". As `nusrat.jahan@campusgig.demo` (student) apply to it.
32. As Sadia: Applicants, Shortlist Nusrat, click "Message Nusrat". The conversation page opens with "No messages yet". Send a message.
33. As Nusrat: "Messages" shows the thread with "1 new". Open it (the badge disappears), reply, then as Sadia wait about 5 seconds: the reply appears without refreshing the page.
34. As Sadia: Accept Nusrat. The job shows In progress; Applicants page and job page show "Mark as completed".
35. Click "Mark as completed" and confirm: status becomes Completed; Nusrat's My applications shows Completed with "Review the poster".
36. As Sadia open "Review the student", try Submit with no rating (message under the rating), then pick 5 stars and submit. Your review card replaces the form.
37. As Nusrat open "Review the poster", submit 4. Open Sadia's profile (via the job): Reviews lists Nusrat's review and the rating line reads 4.0 out of 5 from 1 review. Nusrat's profile shows Sadia's review.
38. Try the review page again: only the read-only review cards show; no form.
39. Back in Messages, open the completed thread: it is read-only ("no longer active"), history still visible.
40. As Tanvir (student) open any job and use "Report this job": choose a reason, send; the form is replaced by a thank-you. Reporting the same job again shows "already reported". Posters cannot see "Report this job" on their own job.
41. Open another user's profile and use "Report this user" (not shown on your own profile).
42. As admin, open `/messages` in the address bar: you are sent back to the admin dashboard.

## 5e. Admin panel (Increment 6)
Run `npm run seed`, then log in as `admin@campusgig.demo`.
43. The dashboard shows grouped counts (People, Jobs, Activity). Open reports is highlighted when above zero.
44. Users: search "nusrat", filter Role = Poster, filter Status. Suspend Tanvir (confirm): the badge turns Suspended. In another browser Tanvir is logged out on the next action, and logging in shows the suspended message. Reactivate him: login works again.
45. Users: there is no Suspend button on admin rows.
46. Suspend a poster (for example Rafiq): the Browse jobs page no longer lists his jobs. Reactivate: they return.
47. Jobs: filter Visibility = Visible, search by title. Remove a job: it disappears from Browse jobs and its public link; as its poster it appears in My jobs marked Removed with an explanation and no link. Restore it: it returns.
48. As a student, report a job (reason Spam). As admin open Reports: it shows under "Needs attention" with the reporter and reason. Press Start review (status becomes Under review), type a note, Resolve. Switch the filter to All reports: the note and "Closed ... by Admin" show.
49. Reports: on a user report press "Suspend this user" and on a job report "Remove this job"; the report stays open until you resolve or dismiss it.
50. As the same student, report the same job again after it was closed: it is accepted. Reporting it while still open says "already reported".
51. Reviews: complete a job and review as in 31-37, then in Admin > Reviews remove that review. The person's rating on their profile drops back (4.0 from 1 review becomes no reviews). Restore it and the rating returns.
52. Categories: add "Video Editing" (it appears when posting a job); rename it; deactivate it (gone from the post-a-job list, existing jobs still show); try adding the same name again (error); delete an unused category; the Delete button is missing for a category with jobs.
53. As a student or poster, type `/admin` in the address bar: you are sent away. A student calling an admin API directly gets 403.

## 6. Send back
Copy any red error text from the terminal or the browser console, and any step number that did not behave as described.
