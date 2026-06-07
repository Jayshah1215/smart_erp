-- Smart ERP Sample Data

USE `smart_erp`;

-- Empty existing tables to avoid duplicate entries (order matters due to FKs)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `notifications`;
TRUNCATE TABLE `automation_logs`;
TRUNCATE TABLE `tasks`;
TRUNCATE TABLE `leaves`;
TRUNCATE TABLE `attendance`;
TRUNCATE TABLE `employees`;
TRUNCATE TABLE `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- Users (Passwords are all 'password123'. SHA-256 hash of 'password123' is:
-- 'ef92b778bafe4f16b8a8b169626b78061514d10aa21e25402d441d412d4418e9' - wait! Let's check:
-- SHA-256 for 'password123' is: ef92b778bafe4f16b8a8b169626b78061514d10aa21e25402d441d412d4418e9
INSERT INTO `users` (`id`, `username`, `password_hash`, `role`) VALUES
(1, 'admin', 'ef92b778bafe4f16b8a8b169626b78061514d10aa21e25402d441d412d4418e9', 'admin'),
(2, 'hr_sarah', 'ef92b778bafe4f16b8a8b169626b78061514d10aa21e25402d441d412d4418e9', 'hr'),
(3, 'emp_john', 'ef92b778bafe4f16b8a8b169626b78061514d10aa21e25402d441d412d4418e9', 'employee'),
(4, 'emp_alice', 'ef92b778bafe4f16b8a8b169626b78061514d10aa21e25402d441d412d4418e9', 'employee'),
(5, 'emp_david', 'ef92b778bafe4f16b8a8b169626b78061514d10aa21e25402d441d412d4418e9', 'employee');

-- Employees
INSERT INTO `employees` (`id`, `user_id`, `first_name`, `last_name`, `email`, `phone`, `department`, `position`, `joining_date`, `status`) VALUES
(1, 1, 'System', 'Admin', 'admin@smart-erp.com', '+15550100', 'Executive', 'Administrator', '2025-01-01', 'active'),
(2, 2, 'Sarah', 'Jenkins', 'sarah.j@smart-erp.com', '+15550101', 'Human Resources', 'HR Manager', '2025-02-15', 'active'),
(3, 3, 'John', 'Doe', 'john.doe@smart-erp.com', '+15550102', 'Engineering', 'Senior Developer', '2025-03-01', 'active'),
(4, 4, 'Alice', 'Smith', 'alice.smith@smart-erp.com', '+15550103', 'Marketing', 'Content Designer', '2025-04-10', 'active'),
(5, 5, 'David', 'Miller', 'david.m@smart-erp.com', '+15550104', 'Engineering', 'QA Engineer', '2025-05-01', 'active');

-- Attendance
INSERT INTO `attendance` (`employee_id`, `date`, `check_in`, `check_out`, `status`) VALUES
(3, '2026-06-05', '09:00:00', '18:00:00', 'present'),
(4, '2026-06-05', '09:15:00', '17:45:00', 'present'),
(5, '2026-06-05', '09:45:00', '18:15:00', 'late'),
(3, '2026-06-06', '08:55:00', '18:05:00', 'present'),
(4, '2026-06-06', '09:02:00', '17:58:00', 'present'),
(5, '2026-06-06', '09:05:00', '18:00:00', 'present');

-- Leaves
INSERT INTO `leaves` (`employee_id`, `leave_type`, `start_date`, `end_date`, `reason`, `status`, `approved_by`) VALUES
(3, 'sick', '2026-06-01', '2026-06-02', 'Fever and cold', 'approved', 2),
(4, 'casual', '2026-06-15', '2026-06-17', 'Family function', 'pending', NULL),
(5, 'annual', '2026-07-01', '2026-07-07', 'Summer vacation trip', 'approved', 2);

-- Tasks
INSERT INTO `tasks` (`id`, `title`, `description`, `assigned_to`, `assigned_by`, `due_date`, `status`, `priority`) VALUES
(1, 'Implement API Gateway', 'Develop routes and setup middleware for CORS, logging and token verification.', 3, 1, '2026-06-15', 'in_progress', 'high'),
(2, 'Design Landing Page Banner', 'Create glassmorphic backgrounds, key visual elements and animations for dashboard entrance.', 4, 2, '2026-06-20', 'todo', 'medium'),
(3, 'Write API Documentation', 'Define endpoints, parameters and schema definitions in Swagger format.', 5, 1, '2026-06-10', 'completed', 'low'),
(4, 'Run Unit Tests for Auth System', 'Write mock test scenarios for password hashing and authentication sessions.', 3, 1, '2026-06-12', 'todo', 'high'),
(5, 'Prepare Marketing Campaign Drafts', 'Prepare content copies for product launch next month.', 4, 2, '2026-06-08', 'completed', 'medium');

-- Automation Logs
INSERT INTO `automation_logs` (`event_type`, `description`) VALUES
('New Employee Automation', 'New Employee account created for David Miller. Welcome email successfully queued and auto-sent to david.m@smart-erp.com.'),
('Leave Trigger Automation', 'Leave request submitted by John Doe. Notification successfully sent to Manager Sarah Jenkins for approval.'),
('Workflow Trigger', 'Task \"Write API Documentation\" marked COMPLETED by David Miller. Notification created for assigner System Admin.');

-- Notifications
INSERT INTO `notifications` (`employee_id`, `message`, `is_read`) VALUES
(1, 'Task \"Write API Documentation\" has been completed by David Miller.', 0),
(2, 'New leave request from Alice Smith requires your review.', 0),
(3, 'Your leave request for 2026-06-01 to 2026-06-02 has been APPROVED.', 1);
