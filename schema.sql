
CREATE TABLE Person (
    ID INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    street TEXT,
    city TEXT,
    country TEXT,
    email TEXT UNIQUE,
    date_of_birth TEXT 
);

CREATE TABLE Person_Phone (
    person_id INTEGER,
    phone_number TEXT,
    PRIMARY KEY (person_id, phone_number),
    FOREIGN KEY (person_id) REFERENCES Person(ID) ON DELETE CASCADE
);

CREATE TABLE Guest (
    ID INTEGER PRIMARY KEY,
    loyalty_points INTEGER DEFAULT 0,
    id_type TEXT,
    id_number TEXT UNIQUE,
    FOREIGN KEY (ID) REFERENCES Person(ID) ON DELETE CASCADE
);

CREATE TABLE Staff (
    ID INTEGER PRIMARY KEY,
    salary REAL NOT NULL,
    department TEXT,
    role TEXT,
    FOREIGN KEY (ID) REFERENCES Person(ID) ON DELETE CASCADE
);

CREATE TABLE Room_type (
    type_id INTEGER PRIMARY KEY,
    type_name TEXT NOT NULL,
    base_price REAL NOT NULL,
    day_night_price REAL NOT NULL,
    max_adults INTEGER NOT NULL,
    max_children INTEGER NOT NULL
);

CREATE TABLE Room (
    room_no TEXT PRIMARY KEY,
    floor_no INTEGER,
    status TEXT,
    type_id INTEGER NOT NULL,
    FOREIGN KEY (type_id) REFERENCES Room_type(type_id) ON DELETE RESTRICT
);

CREATE TABLE Booking (
    booking_id INTEGER PRIMARY KEY,
    check_in_date TEXT NOT NULL,  
    check_out_date TEXT NOT NULL, 
    adults_count INTEGER NOT NULL,
    children_count INTEGER NOT NULL,
    booking_status TEXT,
    guest_id INTEGER NOT NULL,
    room_no TEXT NOT NULL,
    FOREIGN KEY (guest_id) REFERENCES Guest(ID) ON DELETE RESTRICT,
    FOREIGN KEY (room_no) REFERENCES Room(room_no) ON DELETE RESTRICT,
    CONSTRAINT chk_dates CHECK (check_out_date > check_in_date)
);

CREATE TABLE Invoice (
    invoice_id INTEGER PRIMARY KEY,
    issue_date TEXT NOT NULL,
    room_charges REAL DEFAULT 0.00,
    addon_total REAL DEFAULT 0.00,
    addon_items TEXT DEFAULT '[]',
    tax_amount REAL DEFAULT 0.00,
    net_total REAL NOT NULL,
    booking_id INTEGER NOT NULL UNIQUE,
    FOREIGN KEY (booking_id) REFERENCES Booking(booking_id) ON DELETE CASCADE
);

CREATE TABLE Payment (
    invoice_id INTEGER,
    payment_id INTEGER,
    payment_date TEXT NOT NULL,
    amount_paid REAL NOT NULL,
    payment_method TEXT,
    staff_id INTEGER,
    PRIMARY KEY (invoice_id, payment_id),
    FOREIGN KEY (invoice_id) REFERENCES Invoice(invoice_id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES Staff(ID) ON DELETE SET NULL
);
