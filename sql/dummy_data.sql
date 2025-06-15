-- Dummy Data for Banking System Database

-- Insert sample users
INSERT INTO users (first_name, last_name, email, phone, date_of_birth, address) VALUES
('John', 'Doe', 'john.doe@email.com', '+1-555-0101', '1985-03-15', '123 Main St, New York, NY 10001'),
('Jane', 'Smith', 'jane.smith@email.com', '+1-555-0102', '1990-07-22', '456 Oak Ave, Los Angeles, CA 90210'),
('Robert', 'Johnson', 'robert.johnson@email.com', '+1-555-0103', '1978-11-08', '789 Pine Rd, Chicago, IL 60601'),

-- Insert sample accounts
INSERT INTO accounts (user_id, account_number, account_type, balance, currency, status) VALUES
-- John Doe's accounts
(1, '1001234567', 'checking', 2500.75, 'USD', 'active'),
(1, '1001234568', 'savings', 15000.00, 'USD', 'active'),

-- Jane Smith's accounts
(2, '1002345678', 'checking', 1200.50, 'USD', 'active'),
(2, '1002345679', 'savings', 8500.25, 'USD', 'active'),

-- Robert Johnson's accounts
(3, '1003456789', 'business', 45000.00, 'USD', 'active'),
(3, '1003456790', 'checking', 3200.80, 'USD', 'active'),

-- Insert sample transactions
INSERT INTO transactions (account_id, transaction_type, amount, balance_before, balance_after, description, reference_number, related_account_id, status) VALUES
-- John Doe's transactions
(1, 'deposit', 500.00, 2000.75, 2500.75, 'Salary deposit', 'TXN001', NULL, 'completed'),
(2, 'deposit', 1000.00, 14000.00, 15000.00, 'Bonus deposit', 'TXN002', NULL, 'completed'),
(1, 'withdrawal', 200.00, 2500.75, 2300.75, 'ATM withdrawal', 'TXN003', NULL, 'completed'),
(1, 'deposit', 200.00, 2300.75, 2500.75, 'Cash deposit', 'TXN004', NULL, 'completed'),

-- Jane Smith's transactions
(3, 'deposit', 800.00, 400.50, 1200.50, 'Freelance payment', 'TXN005', NULL, 'completed'),
(4, 'deposit', 2000.00, 6500.25, 8500.25, 'Investment return', 'TXN006', NULL, 'completed'),
(3, 'withdrawal', 150.00, 1200.50, 1050.50, 'Grocery shopping', 'TXN007', NULL, 'completed'),
(3, 'deposit', 150.00, 1050.50, 1200.50, 'Refund', 'TXN008', NULL, 'completed'),
