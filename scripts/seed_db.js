const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'hotel.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

const personCount = db.prepare('SELECT COUNT(*) AS count FROM Person').get().count;

if (personCount > 0) {
  console.log('Database already contains data. Seed skipped.');
  db.close();
  process.exit(0);
}

const insertPerson = db.prepare(`
  INSERT INTO Person (
    ID, first_name, last_name, street, city, country, email, date_of_birth
  ) VALUES (
    @ID, @first_name, @last_name, @street, @city, @country, @email, @date_of_birth
  )
`);

const insertPersonPhone = db.prepare(`
  INSERT INTO Person_Phone (person_id, phone_number)
  VALUES (@person_id, @phone_number)
`);

const insertGuest = db.prepare(`
  INSERT INTO Guest (ID, loyalty_points, id_type, id_number)
  VALUES (@ID, @loyalty_points, @id_type, @id_number)
`);

const insertStaff = db.prepare(`
  INSERT INTO Staff (ID, salary, department, role)
  VALUES (@ID, @salary, @department, @role)
`);

const insertRoomType = db.prepare(`
  INSERT INTO Room_type (type_id, type_name, base_price, day_night_price, max_adults, max_children)
  VALUES (@type_id, @type_name, @base_price, @day_night_price, @max_adults, @max_children)
`);

const insertRoom = db.prepare(`
  INSERT INTO Room (room_no, floor_no, status, type_id)
  VALUES (@room_no, @floor_no, @status, @type_id)
`);

const insertBooking = db.prepare(`
  INSERT INTO Booking (
    booking_id, check_in_date, check_out_date, adults_count, children_count, booking_status, guest_id, room_no
  ) VALUES (
    @booking_id, @check_in_date, @check_out_date, @adults_count, @children_count, @booking_status, @guest_id, @room_no
  )
`);

const insertInvoice = db.prepare(`
  INSERT INTO Invoice (
    invoice_id, issue_date, room_charges, addon_total, addon_items, tax_amount, net_total, booking_id
  ) VALUES (
    @invoice_id, @issue_date, @room_charges, @addon_total, @addon_items, @tax_amount, @net_total, @booking_id
  )
`);

const insertPayment = db.prepare(`
  INSERT INTO Payment (
    invoice_id, payment_id, payment_date, amount_paid, payment_method, staff_id
  ) VALUES (
    @invoice_id, @payment_id, @payment_date, @amount_paid, @payment_method, @staff_id
  )
`);

const seed = db.transaction(() => {
  const persons = [
    {
      ID: 1,
      first_name: 'Alice',
      last_name: 'Carter',
      street: '12 Palm Avenue',
      city: 'Miami',
      country: 'USA',
      email: 'alice.carter@example.com',
      date_of_birth: '1990-04-12',
    },
    {
      ID: 2,
      first_name: 'Brian',
      last_name: 'Holt',
      street: '88 Sunset Road',
      city: 'Austin',
      country: 'USA',
      email: 'brian.holt@example.com',
      date_of_birth: '1985-09-03',
    },
    {
      ID: 3,
      first_name: 'Carla',
      last_name: 'Nguyen',
      street: '45 Oak Street',
      city: 'Dallas',
      country: 'USA',
      email: 'carla.nguyen@example.com',
      date_of_birth: '1988-01-25',
    },
    {
      ID: 4,
      first_name: 'Daniel',
      last_name: 'Brooks',
      street: '19 Cedar Lane',
      city: 'Orlando',
      country: 'USA',
      email: 'daniel.brooks@example.com',
      date_of_birth: '1992-11-18',
    },
  ];

  for (const record of persons) insertPerson.run(record);

  const phoneRows = [
    { person_id: 1, phone_number: '+1-305-555-0101' },
    { person_id: 2, phone_number: '+1-512-555-0102' },
    { person_id: 3, phone_number: '+1-214-555-0103' },
    { person_id: 4, phone_number: '+1-407-555-0104' },
  ];

  for (const record of phoneRows) insertPersonPhone.run(record);

  const guests = [
    { ID: 1, loyalty_points: 1200, id_type: 'Passport', id_number: 'P-A1-1001' },
    { ID: 2, loyalty_points: 800, id_type: 'Driver License', id_number: 'DL-B2-2002' },
  ];

  for (const record of guests) insertGuest.run(record);

  const staff = [
    { ID: 3, salary: 48000, department: 'Front Desk', role: 'Receptionist' },
    { ID: 4, salary: 56000, department: 'Finance', role: 'Billing Specialist' },
  ];

  for (const record of staff) insertStaff.run(record);

  const roomTypes = [
    { type_id: 1, type_name: 'Standard Single', base_price: 90, day_night_price: 160, max_adults: 1, max_children: 0 },
    { type_id: 2, type_name: 'Deluxe Double', base_price: 150, day_night_price: 270, max_adults: 2, max_children: 1 },
    { type_id: 3, type_name: 'Executive Suite', base_price: 260, day_night_price: 480, max_adults: 4, max_children: 2 },
  ];

  for (const record of roomTypes) insertRoomType.run(record);

  const rooms = [
    { room_no: '101', floor_no: 1, status: 'Available', type_id: 1 },
    { room_no: '102', floor_no: 1, status: 'Occupied', type_id: 2 },
    { room_no: '201', floor_no: 2, status: 'Available', type_id: 2 },
    { room_no: '202', floor_no: 2, status: 'Maintenance', type_id: 3 },
  ];

  for (const record of rooms) insertRoom.run(record);

  const bookings = [
    {
      booking_id: 1001,
      check_in_date: '2026-07-28',
      check_out_date: '2026-07-31',
      adults_count: 2,
      children_count: 0,
      booking_status: 'Active',
      guest_id: 1,
      room_no: '102',
    },
    {
      booking_id: 1002,
      check_in_date: '2026-07-20',
      check_out_date: '2026-07-23',
      adults_count: 1,
      children_count: 1,
      booking_status: 'Checked Out',
      guest_id: 2,
      room_no: '201',
    },
  ];

  for (const record of bookings) insertBooking.run(record);

  const invoices = [
    { invoice_id: 5001, issue_date: '2026-07-31', room_charges: 450, addon_total: 50, addon_items: '', tax_amount: 45, net_total: 545, booking_id: 1001 },
    { invoice_id: 5002, issue_date: '2026-07-23', room_charges: 300, addon_total: 30, addon_items: '', tax_amount: 30, net_total: 360, booking_id: 1002 },
  ];

  for (const record of invoices) insertInvoice.run(record);

  const payments = [
    { invoice_id: 5001, payment_id: 1, payment_date: '2026-07-31', amount_paid: 495, payment_method: 'Credit Card', staff_id: 3 },
    { invoice_id: 5002, payment_id: 1, payment_date: '2026-07-23', amount_paid: 330, payment_method: 'Cash', staff_id: 4 },
  ];

  for (const record of payments) insertPayment.run(record);
});

seed();

console.log('Seed data inserted successfully.');
db.close();