const express = require("express");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const Filter = require("bad-words");
const {
  generateMessage,
  generateLocationMessage,
} = require("../src/utils/messages");
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
/* 
 Для socketio необходим передавать http сервер, но так как express создает это сервер у себя в недрах и мы не имеем прямого доступа к нему -
 то необходимо создать сервер поверх express, используя встроенную в ноду библитеку http и записать все это в переменную server 
*/
const io = socketio(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 5000;

// socket содержит полезные методы с информацией о подключившемся клиенте
// socket.emit отправялет данные только одному клиенту(socket), запросившему изменения и слушающему действие
// socket.broadcast.emit топравляет данные всем клиентам,слушающему действие, кроме текущего
// io.emit отправялет данные всем клиентам, слушающим действие
// io.to.emit отправялет данные всем клиентам, находящимся в одной комнате
// io.broadcast.to.emit отправялет данные всем клиентам, кроме текущего, находящимся в одной комнате
io.on("connection", (socket) => {
  socket.on("join", ({ username, room }, callback) => {
    console.log(username, room);

    const { error, user } = addUser({ id: socket.id, username, room });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);

    socket.emit("message", generateMessage("Admin", "Welcome!"));
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage("Admin", `${user.username} has joined!`)
      );
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();

    if (filter.isProfane(message)) {
      return callback("Prophenity is not allowed");
    }

    io.to(user.room).emit("message", generateMessage(user.username, message));
    callback(); // наш собственный колбэк, для отображения статуса отправки сообщения
  });

  socket.on("sendLocation", (location, callback) => {
    const user = getUser(socket.id);
    const url = `https://www.google.com/maps?q=${location.lat},${location.lon}`;

    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(user.username, url)
    );
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `${user.username} has left`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(PORT, () => {
  console.log("Listen on port" + PORT);
});
