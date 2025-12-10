# POCA.GG — Project Overview & Priority Task Guide
A Complete Markdown Guide for Rebuilding the Project From Scratch

---

# 1. Overview of POCA.GG

POCA.GG is a platform similar to OP.GG or Maple.gg, but instead of game statistics, it provides **data, reviews, histories, and trust information** about **Toto / Casino** platforms.

The purpose of POCA.GG:
- Help users discover reliable Toto/Casino sites
- Provide scam reports, reviews, event updates, and verified information
- Allow each site to manage its own “detail page” (like OP.GG champions)
- Build a strong DB of:
  - Registered sites
  - Verified sites
  - Scam reports
  - Reviews
  - Events
  - User activities
- Allow site representatives to apply for “administrator” access to update their own page
- Build a future business ecosystem:
  - Private lounge for site owners
  - Telegram groups
  - Paid solutions
  - Affiliate partnerships
  - Point exchange system

---

# 2. Core Concepts

### ## 2.1 User Perspective
Users can:
- Search and explore sites
- View scam histories
- Submit scam reports
- Write reviews
- Manage their profile & badges
- Earn points and redeem benefits
- Post on community boards

### ## 2.2 Site Representative Perspective
Site owners can:
- Apply for site ownership
- Manage:
  - Site details
  - Site events
  - Site experience/history
  - Scam response
  - Additional data

### ## 2.3 Admin Perspective
Administrators can:
- Approve/deny site submissions
- Approve/deny site owner applications
- Manage scams, reviews, events, users, badges
- Manage points, gifticon requests, and exchange requests

---

# 3. High → Low Priority Task List
This list is designed for **starting the project from zero** with maximum development efficiency.

---

# 🔥 Priority Level 1 — MUST Build First (Backend Foundations)

## 3.1 Authentication & User System
- [ ] User registration
- [ ] Login + JWT
- [ ] Password recovery
- [ ] Roles: `user`, `site-owner`, `admin`
- [ ] Basic profile
- [ ] Badge system (core part of the platform)

## 3.2 Site Registration System (Admin-first)
- [ ] Admin creates site entries manually
- [ ] Store:
  - Site name
  - Logo
  - Category (Toto/Casino)
  - Tiers
  - Bonus info (first-charge, reload, etc.)
  - Website URLs
  - Permanent URL
  - Main image
- [ ] Site status:
  - Unverified (default)
  - Verified (site-owner approved)

## 3.3 Site Owner Apply System
- [ ] Users may apply to manage a specific site
- [ ] Admin reviews & approves/denies
- [ ] Once approved:
  - Site owner can update the site detail page
  - Status becomes "POCA.GG is monitoring this site"

## 3.4 Scam Report Core System
- [ ] Users submit scam report
- [ ] Admin reviews & publishes
- [ ] Store:
  - Title
  - Amount stolen
  - Description
  - Evidence images
  - User comments

## 3.5 Review System
- [ ] Users write reviews
- [ ] Rating + text
- [ ] Filters:
  - latest
  - highest rating
  - lowest rating

---

# 🔥 Priority Level 2 — Core User Features

## 3.6 Community Boards
Boards:
- Popular
- POCA board (general)
- Promotion board
- Announcements/Events

Features:
- [ ] Create post
- [ ] Edit/delete post
- [ ] Comments
- [ ] Likes
- [ ] Report post
- [ ] Pagination
- [ ] Filters for “popular posts”

## 3.7 Favorites System
- [ ] Users can bookmark sites
- [ ] Favorite sites appear in homepage search dropdown

## 3.8 Point System (Phase 1)
- [ ] Points accumulate through:
  - Daily attendance
  - Activities
- [ ] Show:
  - Total points
  - Point logs

---

# 🟡 Priority Level 3 — Mid-Level Features

## 3.9 Points Store (Gifticon)
- [ ] Redeem gifticons
- [ ] Admin approval flow
- [ ] Admin gifticon inventory

## 3.10 Points → Casino Money Exchange (Phase 2)
- [ ] Partner integration (future)
- [ ] Exchange request system

## 3.11 Attendance Rank System
- [ ] Daily check-in
- [ ] Ranking history
- [ ] Monthly ranking

---

# 🟢 Priority Level 4 — Site Enhancements

## 3.12 Site Events
- [ ] Site owners can manage event banners
- [ ] Users click → open event modal
- [ ] Admin moderation

## 3.13 Site Experience / Career (for verified sites)
- [ ] Managed by site owner
- [ ] Show timeline of history/achievements

## 3.14 Sliding banners on site detail pages
- [ ] For promotions
- [ ] For events
- [ ] Admin validate before publishing

---

# 🔵 Priority Level 5 — Admin Panel Enhancements

## 3.15 Admin User Management
- [ ] View/edit users
- [ ] Ban/suspend
- [ ] Tier management

## 3.16 Admin Site Management
- [ ] Modify site details
- [ ] Change tiers
- [ ] Manage scam reports
- [ ] Manage reviews

## 3.17 Admin Requests Management
- [ ] Gifticon requests
- [ ] Exchange requests
- [ ] Site owner applications

---

# ⚪ Priority Level 6 — UI/UX Improvements

## 3.18 Frontend Layout (PC)
- [ ] Homepage components
- [ ] Ranking page
- [ ] Site detail pages
- [ ] Community UI
- [ ] Points pages

## 3.19 Mobile Responsive UI
- [ ] Rebuild all PC layouts for mobile
- [ ] Follow style system of maple.gg / chuchu.gg

---

# 7. Future Features (Phase 2+)

- [ ] Telegram community for site owners
- [ ] Analytics dashboard for site performance
- [ ] Paid solutions for high-tier sites
- [ ] Affiliate marketplace integration
- [ ] AI scam-risk score
- [ ] Multi-language support (KR/JP/VN/EN)

---

# 8. Conclusion

Use this document as your **master development guide**.  
Everything is structured to help you code backend APIs in the correct order (from core domain → extra features → UI).

If you want, I can generate next:

### ✅ Full DDD domain breakdown  
### ✅ Full NestJS API Specification (for every module)  
### ✅ Database schema (PostgreSQL/Prisma or TypeORM)  
### ✅ Folder structure for your codebase  
### ✅ GitHub project board (auto-generated issues)

Just tell me:  
**"Generate API Spec"** or **"Generate Database Schema"** or **"Generate DDD Domains"**.
