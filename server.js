const path = require('path');
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
require('dotenv').config(); 

const app = express();

const port = process.env.PORT || 5005;

const dbPath = process.env.DB_PATH || path.join(__dirname, 'hotel.db'); 
const db = new Database(dbPath, { verbose: console.log, readonly: false }); 
db.pragma('foreign_keys = ON'); 

const roomTypeColumns = db.prepare('PRAGMA table_info(Room_type)').all(); 
if (!roomTypeColumns.some((column) => column.name === 'day_night_price')) { 
  db.exec('ALTER TABLE Room_type ADD COLUMN day_night_price REAL NOT NULL DEFAULT 0'); 
}

const invoiceColumns = db.prepare('PRAGMA table_info(Invoice)').all(); 
if (!invoiceColumns.some((column) => column.name === 'addon_total')) { 
  db.exec("ALTER TABLE Invoice ADD COLUMN addon_total REAL DEFAULT 0.00"); 
}
if (!invoiceColumns.some((column) => column.name === 'addon_items')) { 
  db.exec("ALTER TABLE Invoice ADD COLUMN addon_items TEXT DEFAULT '[]'"); 
}


const listActiveBookings = db.prepare(`
  SELECT
    booking_id, first_name, last_name, guest_age, check_in_date, check_out_date, nights
  FROM Active_Bookings_View
  ORDER BY check_in_date DESC, booking_id DESC
`);

const listRooms = db.prepare(`
  SELECT r.room_no, r.floor_no, r.status, rt.type_id, rt.type_name, rt.base_price, rt.max_adults, rt.max_children
  FROM Room r JOIN Room_type rt ON r.type_id = rt.type_id
  ORDER BY CAST(r.floor_no AS INTEGER), r.room_no
`);

const listRoomTypes = db.prepare(`
  SELECT type_id, type_name, base_price, day_night_price, max_adults, max_children
  FROM Room_type ORDER BY type_id
`); 

const listGuests = db.prepare(`
  SELECT p.ID AS person_id, p.first_name, p.last_name, p.street, p.city, p.country, p.email, p.date_of_birth,
    g.loyalty_points, g.id_type, g.id_number, COALESCE(GROUP_CONCAT(pp.phone_number, ', '), '') AS phone_numbers
  FROM Person p JOIN Guest g ON p.ID = g.ID LEFT JOIN Person_Phone pp ON p.ID = pp.person_id
  GROUP BY p.ID, p.first_name, p.last_name, p.street, p.city, p.country, p.email, p.date_of_birth, g.loyalty_points, g.id_type, g.id_number
  ORDER BY p.last_name, p.first_name
`); 

const listStaff = db.prepare(`
  SELECT p.ID AS staff_id, p.first_name, p.last_name, p.street, p.city, p.country, p.email, p.date_of_birth,
    s.department, s.role, s.salary, COALESCE(GROUP_CONCAT(pp.phone_number, ', '), '') AS phone_numbers
  FROM Staff s JOIN Person p ON s.ID = p.ID LEFT JOIN Person_Phone pp ON p.ID = pp.person_id
  GROUP BY p.ID, p.first_name, p.last_name, p.street, p.city, p.country, p.email, p.date_of_birth, s.department, s.role, s.salary
  ORDER BY p.last_name, p.first_name
`);

const listBookings = db.prepare(`
  SELECT b.booking_id, b.guest_id, b.check_in_date, b.check_out_date, b.adults_count, b.children_count, b.booking_status, p.first_name, p.last_name, r.room_no, rt.day_night_price
  FROM Booking b JOIN Guest g ON b.guest_id = g.ID JOIN Person p ON g.ID = p.ID JOIN Room r ON b.room_no = r.room_no JOIN Room_type rt ON r.type_id = rt.type_id
  ORDER BY b.check_in_date DESC, b.booking_id DESC
`); 

const listInvoices = db.prepare(`
  SELECT i.invoice_id, i.issue_date, i.room_charges, i.addon_total, i.addon_items, i.tax_amount, i.net_total, i.booking_id, b.check_in_date, b.check_out_date, p.first_name, p.last_name, r.room_no
  FROM Invoice i JOIN Booking b ON i.booking_id = b.booking_id JOIN Guest g ON b.guest_id = g.ID JOIN Person p ON g.ID = p.ID JOIN Room r ON b.room_no = r.room_no
  ORDER BY i.issue_date DESC, i.invoice_id DESC
`); 

const listPayments = db.prepare(`
  SELECT pay.invoice_id, pay.payment_id, pay.payment_date, pay.amount_paid, pay.payment_method, pay.staff_id, COALESCE(sp.first_name || ' ' || sp.last_name, 'Unassigned') AS staff_name, i.net_total
  FROM Payment pay JOIN Invoice i ON pay.invoice_id = i.invoice_id LEFT JOIN Staff s ON pay.staff_id = s.ID LEFT JOIN Person sp ON s.ID = sp.ID
  ORDER BY pay.payment_date DESC, pay.invoice_id DESC, pay.payment_id DESC
`); 

const insertBooking = db.prepare(`INSERT INTO Booking (check_in_date, check_out_date, adults_count, children_count, booking_status, guest_id, room_no) VALUES (@check_in_date, @check_out_date, @adults_count, @children_count, @booking_status, @guest_id, @room_no)`); 
const updateBooking = db.prepare(`UPDATE Booking SET check_in_date = @check_in_date, check_out_date = @check_out_date, adults_count = @adults_count, children_count = @children_count, booking_status = @booking_status, guest_id = @guest_id, room_no = @room_no WHERE booking_id = @booking_id`); 
const deleteBookingById = db.prepare('DELETE FROM Booking WHERE booking_id = ?'); 

const insertGuestPerson = db.prepare(`INSERT INTO Person (first_name, last_name, street, city, country, email, date_of_birth) VALUES (@first_name, @last_name, @street, @city, @country, @email, @date_of_birth)`); 
const insertGuestRole = db.prepare(`INSERT INTO Guest (ID, loyalty_points, id_type, id_number) VALUES (@ID, @loyalty_points, @id_type, @id_number)`); 
const updateGuestPerson = db.prepare(`UPDATE Person SET first_name = @first_name, last_name = @last_name, street = @street, city = @city, country = @country, email = @email, date_of_birth = @date_of_birth WHERE ID = @ID`); 
const updateGuestRole = db.prepare(`UPDATE Guest SET loyalty_points = @loyalty_points, id_type = @id_type, id_number = @id_number WHERE ID = @ID`); 
const deleteGuestById = db.prepare('DELETE FROM Person WHERE ID = ?'); 

const insertStaffPerson = db.prepare(`INSERT INTO Person (first_name, last_name, street, city, country, email, date_of_birth) VALUES (@first_name, @last_name, @street, @city, @country, @email, @date_of_birth)`); 
const insertStaffRole = db.prepare(`INSERT INTO Staff (ID, salary, department, role, password_hash) VALUES (@ID, @salary, @department, @role, @password_hash)`); 
const updateStaffPerson = db.prepare(`UPDATE Person SET first_name = @first_name, last_name = @last_name, street = @street, city = @city, country = @country, email = @email, date_of_birth = @date_of_birth WHERE ID = @ID`); 
const updateStaffRole = db.prepare(`UPDATE Staff SET salary = @salary, department = @department, role = @role WHERE ID = @ID`); 
const deleteStaffById = db.prepare('DELETE FROM Person WHERE ID = ?'); 

const insertRoomType = db.prepare(`INSERT INTO Room_type (type_name, base_price, day_night_price, max_adults, max_children) VALUES (@type_name, @base_price, @day_night_price, @max_adults, @max_children)`); 
const updateRoomType = db.prepare(`UPDATE Room_type SET type_name = @type_name, base_price = @base_price, day_night_price = @day_night_price, max_adults = @max_adults, max_children = @max_children WHERE type_id = @type_id`); 
const insertRoom = db.prepare(`INSERT INTO Room (room_no, floor_no, status, type_id) VALUES (@room_no, @floor_no, @status, @type_id)`); 
const updateRoom = db.prepare(`UPDATE Room SET floor_no = @floor_no, status = @status, type_id = @type_id WHERE room_no = @room_no`); 
const countBookingsByRoomNo = db.prepare('SELECT COUNT(*) AS booking_count FROM Booking WHERE room_no = ?'); 
const deleteRoomByNo = db.prepare('DELETE FROM Room WHERE room_no = ?'); 

const insertInvoice = db.prepare(`INSERT INTO Invoice (issue_date, room_charges, addon_total, addon_items, tax_amount, net_total, booking_id) VALUES (@issue_date, @room_charges, @addon_total, @addon_items, @tax_amount, @net_total, @booking_id)`); 
const updateInvoice = db.prepare(`UPDATE Invoice SET issue_date = @issue_date, room_charges = @room_charges, addon_total = @addon_total, addon_items = @addon_items, tax_amount = @tax_amount, net_total = @net_total, booking_id = @booking_id WHERE invoice_id = @invoice_id`); 
const deleteInvoiceById = db.prepare('DELETE FROM Invoice WHERE invoice_id = ?'); 

const insertPayment = db.prepare(`INSERT INTO Payment (invoice_id, payment_id, payment_date, amount_paid, payment_method, staff_id) VALUES (@invoice_id, @payment_id, @payment_date, @amount_paid, @payment_method, @staff_id)`); 
const updatePayment = db.prepare(`UPDATE Payment SET payment_date = @payment_date, amount_paid = @amount_paid, payment_method = @payment_method, staff_id = @staff_id WHERE invoice_id = @invoice_id AND payment_id = @payment_id`); 
const deletePaymentById = db.prepare('DELETE FROM Payment WHERE invoice_id = ? AND payment_id = ?'); 

const createBooking = db.transaction((payload) => {
  const result = insertBooking.run(payload);
  return result.lastInsertRowid;
}); 

const createInvoice = db.transaction((payload) => {
  const result = insertInvoice.run(payload);
  return result.lastInsertRowid;
}); 

const createPayment = db.transaction((payload) => {
  const nextPaymentId = db.prepare('SELECT COALESCE(MAX(payment_id), 0) + 1 AS next_payment_id FROM Payment WHERE invoice_id = ?').get(payload.invoice_id).next_payment_id; 
  const result = insertPayment.run({ ...payload, payment_id: nextPaymentId }); 
  return { lastInsertRowid: result.lastInsertRowid, payment_id: nextPaymentId }; 
});


app.use(cors()); 
app.use(express.json()); 


app.post('/api/login', async (req, res) => {
    const { email, password } = req.body; 

    try {
        const stmt = db.prepare(`
            SELECT p.ID, p.first_name, p.last_name, p.email, s.role, s.department, s.password_hash 
            FROM Person p 
            JOIN Staff s ON p.ID = s.ID 
            WHERE p.email = ?
        `); 
        const user = stmt.get(email); 

        if (!user || !user.password_hash) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' }); 
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (isMatch) {
            res.status(200).json({ 
                success: true, 
                message: 'Login successful', 
                user: { 
                    id: user.ID, 
                    name: `${user.first_name} ${user.last_name}`, 
                    role: user.role, 
                    department: user.department 
                } 
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid email or password.' }); 
        }
    } catch (error) {
        console.error("Login Error:", error); 
        res.status(500).json({ success: false, message: 'Internal Server Error' }); 
    }
}); 

app.get('/api/health', (req, res) => res.json({ status: 'ok' })); 

app.get('/api/bookings', (req, res) => {
  try { res.json({ data: listActiveBookings.all() }); } 
  catch (error) { res.status(500).json({ message: 'Failed to fetch active bookings' }); } 
});

app.get('/api/rooms', (req, res) => {
  try { res.json({ data: listRooms.all() }); } 
  catch (error) { res.status(500).json({ message: 'Failed to fetch rooms' }); } 
});

app.get('/api/room-types', (req, res) => {
  try { res.json({ data: listRoomTypes.all() }); } 
  catch (error) { res.status(500).json({ message: 'Failed to fetch room types' }); } 
});

app.get('/api/guests', (req, res) => {
  try { res.json({ data: listGuests.all() }); } 
  catch (error) { res.status(500).json({ message: 'Failed to fetch guests' }); } 
});

app.get('/api/staff', (req, res) => {
  try { res.json({ data: listStaff.all() }); } 
  catch (error) { res.status(500).json({ message: 'Failed to fetch staff' }); } 
});

app.get('/api/bookings/all', (req, res) => {
  try { res.json({ data: listBookings.all() }); } 
  catch (error) { res.status(500).json({ message: 'Failed to fetch bookings' }); } 
});

app.get('/api/invoices', (req, res) => {
  try { res.json({ data: listInvoices.all() }); } 
  catch (error) { res.status(500).json({ message: 'Failed to fetch invoices' }); } 
});

app.get('/api/payments', (req, res) => {
  try { res.json({ data: listPayments.all() }); } 
  catch (error) { res.status(500).json({ message: 'Failed to fetch payments' }); } 
});

app.post('/api/guests', (req, res) => {
  try {
    const { first_name, last_name, street = null, city = null, country = null, email = null, date_of_birth = null, phone_number = null, loyalty_points = 0, id_type = null, id_number = null } = req.body; 
    if (!first_name || !last_name) return res.status(400).json({ message: 'Missing required guest fields.' }); 
    
    const personInsert = insertGuestPerson.run({ first_name, last_name, street, city, country, email, date_of_birth }); 
    const guestId = Number(personInsert.lastInsertRowid); 
    insertGuestRole.run({ ID: guestId, loyalty_points: Number(loyalty_points ?? 0), id_type, id_number }); 
    if (phone_number) db.prepare('INSERT INTO Person_Phone (person_id, phone_number) VALUES (?, ?)').run(guestId, phone_number); 
    
    res.status(201).json({ message: 'Guest created successfully', guest_id: guestId }); 
  } catch (error) { res.status(500).json({ message: 'Failed to create guest' }); } 
});

app.patch('/api/guests/:guestId', (req, res) => {
  try {
    const { guestId } = req.params; 
    const { first_name, last_name, street = null, city = null, country = null, email = null, date_of_birth = null, phone_number = null, loyalty_points = 0, id_type = null, id_number = null } = req.body; 
    if (!guestId || !first_name || !last_name) return res.status(400).json({ message: 'Missing required guest fields.' }); 

    const updateGuest = db.transaction(() => {
      const personResult = updateGuestPerson.run({ ID: Number(guestId), first_name, last_name, street, city, country, email, date_of_birth }); 
      if (personResult.changes === 0) return { changes: 0 }; 
      updateGuestRole.run({ ID: Number(guestId), loyalty_points: Number(loyalty_points ?? 0), id_type, id_number }); 
      db.prepare('DELETE FROM Person_Phone WHERE person_id = ?').run(Number(guestId)); 
      if (phone_number) db.prepare('INSERT INTO Person_Phone (person_id, phone_number) VALUES (?, ?)').run(Number(guestId), phone_number); 
      return { changes: 1 }; 
    });

    const result = updateGuest(); 
    if (result.changes === 0) return res.status(404).json({ message: 'Guest not found.' }); 
    res.json({ message: 'Guest updated successfully', guest_id: Number(guestId) }); 
  } catch (error) { res.status(500).json({ message: 'Failed to update guest' }); } 
});

app.delete('/api/guests/:guestId', (req, res) => {
  try {
    const { guestId } = req.params; 
    if (!guestId) return res.status(400).json({ message: 'Missing guest id.' }); 
    const result = deleteGuestById.run(Number(guestId)); 
    if (result.changes === 0) return res.status(404).json({ message: 'Guest not found.' }); 
    res.json({ message: 'Guest deleted successfully', guest_id: Number(guestId) }); 
  } catch (error) { res.status(500).json({ message: 'Failed to delete guest' }); } 
});

app.post('/api/staff', async (req, res) => {
  try {
    const { first_name, last_name, street, city, country, email, date_of_birth, phone_number, phone_number_2, salary, department, role, password } = req.body; 
    
    if (!first_name || !last_name || salary == null || !password) {
        return res.status(400).json({ message: 'Missing required staff fields or password.' }); 
    }
    
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const personInsert = insertStaffPerson.run({ first_name, last_name, street, city, country, email, date_of_birth }); 
    const staffId = Number(personInsert.lastInsertRowid); 
    
    insertStaffRole.run({ ID: staffId, salary: Number(salary), department, role, password_hash }); 
    if (phone_number) db.prepare('INSERT INTO Person_Phone (person_id, phone_number) VALUES (?, ?)').run(staffId, phone_number); 
    if (phone_number_2) db.prepare('INSERT INTO Person_Phone (person_id, phone_number) VALUES (?, ?)').run(staffId, phone_number_2); 
    
    res.status(201).json({ message: 'Staff created successfully', staff_id: staffId }); 
  } catch (error) { 
      res.status(500).json({ message: 'Failed to create staff' }); 
  } 
});

app.patch('/api/staff/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params; 
    const { first_name, last_name, street = null, city = null, country = null, email = null, date_of_birth = null, phone_number = null, phone_number_2 = null, salary, department = null, role = null } = req.body; 
    if (!staffId || !first_name || !last_name || salary == null) return res.status(400).json({ message: 'Missing required staff fields.' }); 

    const updateStaff = db.transaction(() => {
      const personResult = updateStaffPerson.run({ ID: Number(staffId), first_name, last_name, street, city, country, email, date_of_birth }); 
      if (personResult.changes === 0) return { changes: 0 }; 
      updateStaffRole.run({ ID: Number(staffId), salary: Number(salary), department, role }); 
      db.prepare('DELETE FROM Person_Phone WHERE person_id = ?').run(Number(staffId)); 
      if (phone_number) db.prepare('INSERT INTO Person_Phone (person_id, phone_number) VALUES (?, ?)').run(Number(staffId), phone_number); 
      if (phone_number_2) db.prepare('INSERT INTO Person_Phone (person_id, phone_number) VALUES (?, ?)').run(Number(staffId), phone_number_2); 
      return { changes: 1 }; 
    });

    const result = updateStaff(); 
    if (result.changes === 0) return res.status(404).json({ message: 'Staff not found.' }); 
    res.json({ message: 'Staff updated successfully', staff_id: Number(staffId) }); 
  } catch (error) { res.status(500).json({ message: 'Failed to update staff' }); } 
});

app.delete('/api/staff/:staffId', (req, res) => {
  try {
    const { staffId } = req.params; 
    const result = deleteStaffById.run(Number(staffId)); 
    if (result.changes === 0) return res.status(404).json({ message: 'Staff not found.' }); 
    res.json({ message: 'Staff deleted successfully', staff_id: Number(staffId) }); 
  } catch (error) { res.status(500).json({ message: 'Failed to delete staff' }); } 
});

app.post('/api/room-types', (req, res) => {
  try {
    const { type_name, base_price, day_night_price, max_adults, max_children } = req.body; 
    const result = insertRoomType.run({ type_name, base_price: Number(base_price), day_night_price: Number(day_night_price), max_adults: Number(max_adults), max_children: Number(max_children) }); 
    res.status(201).json({ message: 'Room type created successfully', type_id: result.lastInsertRowid }); 
  } catch (error) { res.status(500).json({ message: 'Failed to create room type' }); } 
});

app.patch('/api/room-types/:typeId', (req, res) => {
  try {
    const typeId = Number(req.params.typeId); 
    const { type_name, base_price, day_night_price, max_adults, max_children } = req.body; 
    const result = updateRoomType.run({ type_id: typeId, type_name, base_price: Number(base_price), day_night_price: Number(day_night_price), max_adults: Number(max_adults), max_children: Number(max_children) }); 
    if (result.changes === 0) return res.status(404).json({ message: 'Room type not found.' }); 
    res.json({ message: 'Room type updated successfully', type_id: typeId }); 
  } catch (error) { res.status(500).json({ message: 'Failed to update room type' }); } 
});

app.post('/api/rooms', (req, res) => {
  try {
    const { room_no, floor_no = null, status = null, type_id } = req.body; 
    insertRoom.run({ room_no, floor_no: floor_no === '' || floor_no == null ? null : Number(floor_no), status, type_id: Number(type_id) }); 
    res.status(201).json({ message: 'Room created successfully', room_no }); 
  } catch (error) { res.status(500).json({ message: 'Failed to create room' }); } 
});

app.patch('/api/rooms/:roomNo', (req, res) => {
  try {
    const { roomNo } = req.params; 
    const { floor_no = null, status = null, type_id } = req.body; 
    const result = updateRoom.run({ room_no: roomNo, floor_no: floor_no === '' || floor_no == null ? null : Number(floor_no), status, type_id: Number(type_id) }); 
    if (result.changes === 0) return res.status(404).json({ message: 'Room not found.' }); 
    res.json({ message: 'Room updated successfully', room_no: roomNo }); 
  } catch (error) { res.status(500).json({ message: 'Failed to update room' }); } 
});

app.delete('/api/rooms/:roomNo', (req, res) => {
  try {
    const { roomNo } = req.params; 
    const bookingCount = countBookingsByRoomNo.get(roomNo)?.booking_count ?? 0; 
    if (bookingCount > 0) {
      return res.status(400).json({ message: 'Cannot delete a room that has bookings.' }); 
    }

    const result = deleteRoomByNo.run(roomNo); 
    if (result.changes === 0) return res.status(404).json({ message: 'Room not found.' }); 
    res.json({ message: 'Room deleted successfully', room_no: roomNo }); 
  } catch (error) { res.status(500).json({ message: 'Failed to delete room' }); } 
});

app.post('/api/bookings', (req, res) => {
  try {
    const { check_in_date, check_out_date, adults_count, children_count, booking_status = 'Active', guest_id, room_no } = req.body; 
    const bookingId = createBooking({ check_in_date, check_out_date, adults_count: Number(adults_count ?? 1), children_count: Number(children_count ?? 0), booking_status, guest_id: Number(guest_id), room_no }); 
    res.status(201).json({ message: 'Booking created successfully', booking_id: bookingId }); 
  } catch (error) { res.status(500).json({ message: 'Failed to create booking' }); } 
});

app.patch('/api/bookings/:bookingId', (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId); 
    const { check_in_date, check_out_date, adults_count, children_count, booking_status = 'Active', guest_id, room_no } = req.body; 
    const result = updateBooking.run({ booking_id: bookingId, check_in_date, check_out_date, adults_count: Number(adults_count ?? 1), children_count: Number(children_count ?? 0), booking_status, guest_id: Number(guest_id), room_no }); 
    if (result.changes === 0) return res.status(404).json({ message: 'Booking not found.' }); 
    res.json({ message: 'Booking updated successfully', booking_id: bookingId }); 
  } catch (error) { res.status(500).json({ message: 'Failed to update booking' }); } 
});

app.delete('/api/bookings/:bookingId', (req, res) => {
  try {
    const result = deleteBookingById.run(Number(req.params.bookingId)); 
    if (result.changes === 0) return res.status(404).json({ message: 'Booking not found.' }); 
    res.json({ message: 'Booking deleted successfully', booking_id: Number(req.params.bookingId) }); 
  } catch (error) { res.status(500).json({ message: 'Failed to delete booking' }); } 
});

app.post('/api/invoices', (req, res) => {
  try {
    const { issue_date, room_charges, addon_total = 0, addon_items = '[]', tax_amount, net_total, booking_id } = req.body; 
    const invoiceId = createInvoice({ issue_date, room_charges: Number(room_charges ?? 0), addon_total: Number(addon_total ?? 0), addon_items, tax_amount: Number(tax_amount ?? 0), net_total: Number(net_total), booking_id: Number(booking_id) }); 
    res.status(201).json({ message: 'Invoice created successfully', invoice_id: invoiceId }); 
  } catch (error) { res.status(500).json({ message: 'Failed to create invoice' }); } 
});

app.patch('/api/invoices/:invoiceId', (req, res) => {
  try {
    const invoiceId = Number(req.params.invoiceId); 
    const { issue_date, room_charges, addon_total = 0, addon_items = '[]', tax_amount, net_total, booking_id } = req.body; 
    const result = updateInvoice.run({ invoice_id: invoiceId, issue_date, room_charges: Number(room_charges ?? 0), addon_total: Number(addon_total ?? 0), addon_items, tax_amount: Number(tax_amount ?? 0), net_total: Number(net_total), booking_id: Number(booking_id) }); 
    if (result.changes === 0) return res.status(404).json({ message: 'Invoice not found.' }); 
    res.json({ message: 'Invoice updated successfully', invoice_id: invoiceId }); 
  } catch (error) { res.status(500).json({ message: 'Failed to update invoice' }); } 
});

app.delete('/api/invoices/:invoiceId', (req, res) => {
  try {
    const result = deleteInvoiceById.run(Number(req.params.invoiceId)); 
    if (result.changes === 0) return res.status(404).json({ message: 'Invoice not found.' }); 
    res.json({ message: 'Invoice deleted successfully', invoice_id: Number(req.params.invoiceId) }); 
  } catch (error) { res.status(500).json({ message: 'Failed to delete invoice' }); } 
});

app.post('/api/payments', (req, res) => {
  try {
    const { invoice_id, payment_date, amount_paid, payment_method, staff_id } = req.body; 
    const paymentRecord = createPayment({ invoice_id: Number(invoice_id), payment_date, amount_paid: Number(amount_paid), payment_method: payment_method || null, staff_id: staff_id === '' || staff_id == null ? null : Number(staff_id) }); 
    res.status(201).json({ message: 'Payment created successfully', invoice_id: Number(invoice_id), payment_id: paymentRecord.payment_id }); 
  } catch (error) { res.status(500).json({ message: 'Failed to create payment' }); } 
});

app.patch('/api/payments/:invoiceId/:paymentId', (req, res) => {
  try {
    const invoiceId = Number(req.params.invoiceId); 
    const paymentId = Number(req.params.paymentId); 
    const { payment_date, amount_paid, payment_method, staff_id } = req.body; 
    const result = updatePayment.run({ invoice_id: invoiceId, payment_id: paymentId, payment_date, amount_paid: Number(amount_paid), payment_method: payment_method || null, staff_id: staff_id === '' || staff_id == null ? null : Number(staff_id) }); 
    if (result.changes === 0) return res.status(404).json({ message: 'Payment not found.' }); 
    res.json({ message: 'Payment updated successfully', invoice_id: invoiceId, payment_id: paymentId }); 
  } catch (error) { res.status(500).json({ message: 'Failed to update payment' }); } 
});

app.delete('/api/payments/:invoiceId/:paymentId', (req, res) => {
  try {
    const result = deletePaymentById.run(Number(req.params.invoiceId), Number(req.params.paymentId)); 
    if (result.changes === 0) return res.status(404).json({ message: 'Payment not found.' }); 
    res.json({ message: 'Payment deleted successfully', invoice_id: Number(req.params.invoiceId), payment_id: Number(req.params.paymentId) }); 
  } catch (error) { res.status(500).json({ message: 'Failed to delete payment' }); } 
});

app.use((req, res) => res.status(404).json({ message: 'Route not found' })); 


const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Hotel API running on http://127.0.0.1:${port}`);
  console.log(`Using database: ${dbPath}`);
}); 

function shutdown() {
  server.close(() => {
    db.close(); 
    process.exit(0); 
  }); 
} 

process.on('SIGINT', shutdown); 
process.on('SIGTERM', shutdown); 