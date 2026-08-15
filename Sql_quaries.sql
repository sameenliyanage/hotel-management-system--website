CREATE DATABASE IF NOT EXISTS HotelDB;
USE HotelDB;

CREATE TABLE Person (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    street VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    date_of_birth DATE
);

CREATE TABLE Person_Phone (
    person_id INT,
    phone_number VARCHAR(20),
    PRIMARY KEY (person_id, phone_number),
    FOREIGN KEY (person_id) REFERENCES Person(ID) ON DELETE CASCADE
);

CREATE TABLE Guest (
    ID INT PRIMARY KEY,
    loyalty_points INT DEFAULT 0,
    id_type VARCHAR(50),
    id_number VARCHAR(100) UNIQUE,
    FOREIGN KEY (ID) REFERENCES Person(ID) ON DELETE CASCADE
);

CREATE TABLE Staff (
    ID INT PRIMARY KEY,
    salary DECIMAL(10,2) NOT NULL,
    department VARCHAR(100),
    role VARCHAR(50),
    FOREIGN KEY (ID) REFERENCES Person(ID) ON DELETE CASCADE
);

CREATE TABLE Room_type (
    type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    day_night_price DECIMAL(10,2) NOT NULL,
    max_adults INT NOT NULL,
    max_children INT NOT NULL
);

CREATE TABLE Room (
    room_no VARCHAR(20) PRIMARY KEY,
    floor_no INT,
    status VARCHAR(50),
    type_id INT NOT NULL,
    FOREIGN KEY (type_id) REFERENCES Room_type(type_id) ON DELETE RESTRICT
);

CREATE TABLE Booking (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    check_in_date DATE NOT NULL,  
    check_out_date DATE NOT NULL, 
    adults_count INT NOT NULL,
    children_count INT NOT NULL,
    booking_status VARCHAR(50),
    guest_id INT NOT NULL,
    room_no VARCHAR(20) NOT NULL,
    FOREIGN KEY (guest_id) REFERENCES Guest(ID) ON DELETE RESTRICT,
    FOREIGN KEY (room_no) REFERENCES Room(room_no) ON DELETE RESTRICT,
    CONSTRAINT chk_dates CHECK (check_out_date > check_in_date)
);

CREATE TABLE Invoice (
    invoice_id INT AUTO_INCREMENT PRIMARY KEY,
    issue_date DATE NOT NULL,
    room_charges DECIMAL(10,2) DEFAULT 0.00,
    addon_total DECIMAL(10,2) DEFAULT 0.00,
    addon_items VARCHAR(500) DEFAULT '[]', 
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    net_total DECIMAL(10,2) NOT NULL,
    booking_id INT NOT NULL UNIQUE, 
    FOREIGN KEY (booking_id) REFERENCES Booking(booking_id) ON DELETE CASCADE
);

CREATE TABLE Payment (
    invoice_id INT,
    payment_id INT,
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    staff_id INT,
    PRIMARY KEY (invoice_id, payment_id),
    FOREIGN KEY (invoice_id) REFERENCES Invoice(invoice_id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES Staff(ID) ON DELETE SET NULL
);