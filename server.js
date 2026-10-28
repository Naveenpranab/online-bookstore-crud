require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  category: { type: String, default: 'General', trim: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  description: { type: String, default: '' }
}, { timestamps: true });
const orderSchema = new mongoose.Schema({
  customerName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  quantity: { type: Number, required: true, min: 1 },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending' }
}, { timestamps: true });
const Book = mongoose.model('Book', bookSchema);
const Order = mongoose.model('Order', orderSchema);

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const validId = id => mongoose.isValidObjectId(id);

app.get('/api/health', (req, res) => res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));

// Books: create, read, update, delete
app.get('/api/books', asyncRoute(async (req, res) => {
  const filter = {};
  if (req.query.search) filter.$or = [
    { title: { $regex: req.query.search, $options: 'i' } },
    { author: { $regex: req.query.search, $options: 'i' } },
    { category: { $regex: req.query.search, $options: 'i' } }
  ];
  res.json(await Book.find(filter).sort({ createdAt: -1 }).lean());
}));
app.post('/api/books', asyncRoute(async (req, res) => {
  const book = await Book.create(req.body);
  res.status(201).json(book);
}));
app.put('/api/books/:id', asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid book ID' });
  const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
}));
app.delete('/api/books/:id', asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid book ID' });
  const hasOrders = await Order.exists({ book: req.params.id, status: { $ne: 'Cancelled' } });
  if (hasOrders) return res.status(409).json({ error: 'This book has active orders. Cancel those orders before deleting it.' });
  const book = await Book.findByIdAndDelete(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json({ message: 'Book deleted' });
}));

// Orders: create, read, update status. Orders can be created by the admin demo form.
app.get('/api/orders', asyncRoute(async (req, res) => {
  res.json(await Order.find().populate('book', 'title author price').sort({ createdAt: -1 }).lean());
}));
app.post('/api/orders', asyncRoute(async (req, res) => {
  const { customerName, email, bookId, quantity } = req.body;
  if (!validId(bookId)) return res.status(400).json({ error: 'Select a valid book' });
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'Quantity must be a positive whole number' });
  const book = await Book.findById(bookId);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  if (book.stock < qty) return res.status(409).json({ error: 'Not enough stock available' });
  book.stock -= qty;
  await book.save();
  try {
    const order = await Order.create({ customerName, email, book: book._id, quantity: qty, total: book.price * qty });
    res.status(201).json(await order.populate('book', 'title author price'));
  } catch (error) {
    book.stock += qty;
    await book.save();
    throw error;
  }
}));
app.patch('/api/orders/:id/status', asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid order ID' });
  const allowed = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Invalid order status' });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'Cancelled' && req.body.status === 'Cancelled') {
    await Book.findByIdAndUpdate(order.book, { $inc: { stock: order.quantity } });
  } else if (order.status === 'Cancelled' && req.body.status !== 'Cancelled') {
    const book = await Book.findById(order.book);
    if (!book || book.stock < order.quantity) return res.status(409).json({ error: 'Insufficient stock to reopen this order' });
    book.stock -= order.quantity;
    await book.save();
  }
  order.status = req.body.status;
  await order.save();
  res.json(await order.populate('book', 'title author price'));
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: err.message });
  if (err.code === 11000) return res.status(409).json({ error: 'A record with those details already exists' });
  res.status(500).json({ error: 'Server error. Check server logs and database configuration.' });
});

async function start() {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI is not set. Add it to .env before using the API.');
  } else {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  }
  app.listen(PORT, () => console.log(`Bookstore running on port ${PORT}`));
}
start().catch(err => { console.error('Startup failed:', err.message); process.exit(1); });
