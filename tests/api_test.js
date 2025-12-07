// __tests__/api.test.js
const request = require('supertest');
const fs = require('fs');
const path = require('path');

const app = require('../index');
const dataDir = path.join(__dirname, '..', 'data');

beforeAll(() => {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  fs.writeFileSync(path.join(dataDir, 'customers.json'), JSON.stringify([], null, 2));
  fs.writeFileSync(path.join(dataDir, 'services.json'), JSON.stringify([], null, 2));
  fs.writeFileSync(path.join(dataDir, 'appointments.json'), JSON.stringify([], null, 2));
});

afterAll(() => {
  // leave files for inspection
});

describe('JSON API flows', () => {
  let custId, servId, apptId;

  test('create customer', async () => {
    const res = await request(app).post('/api/customers').send({ name: 'Test User', phone: '012' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test User');
    custId = res.body.id;
  });

  test('create service', async () => {
    const res = await request(app).post('/api/services').send({ title: 'Cut', duration_min: 30, price: 15 });
    expect(res.status).toBe(201);
    servId = res.body.id;
    expect(res.body.title).toBe('Cut');
  });

  test('create appointment', async () => {
    const res = await request(app).post('/api/appointments').send({
      customerId: custId, serviceId: servId, appointment_date: '2025-04-20', start_time: '10:00'
    });
    expect(res.status).toBe(201);
    expect(String(res.body.customer_id)).toBe(String(custId));
    apptId = res.body.id;
  });

  test('get appointments by date', async () => {
    const res = await request(app).get('/api/appointments?date=2025-04-20');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  test('conflict on same slot', async () => {
    const res = await request(app).post('/api/appointments').send({
      customerId: custId, serviceId: servId, appointment_date: '2025-04-20', start_time: '10:00'
    });
    expect(res.status).toBe(409);
  });
});
