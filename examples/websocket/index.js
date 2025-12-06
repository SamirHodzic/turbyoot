import { Turbyoot } from 'turbyoot';
import { Server } from 'socket.io';

const app = new Turbyoot();

app.use(
  app.static('./client', {
    prefix: '/',
  }),
);

const server = app.listen(3000, () => {
  console.log('Turbyoot is running on port 3000');
});

const io = new Server(server);

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});
