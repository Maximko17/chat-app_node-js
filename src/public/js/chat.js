const socket = io();

// DOM elements
const $messageForm = document.querySelector("#message-form");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $sendLocationButton = document.querySelector("#send-location");
const $messages = document.querySelector("#messages");

//Templates
const $messageTemplate = document.querySelector("#message-template").innerHTML;
const $locationMessageTemplate = document.querySelector(
  "#location-message-template"
).innerHTML;
const $sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

//Options
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const autoScroll = () => {
  const $newMessage = $messages.lastElementChild;

  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  const visibleHeight = $messages.offsetHeight;

  const containerHeight = $messages.scrollHeight;

  const scrollOffset = $messages.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

// Делаем слушателя, которые мониторит данные приходящие с сервера по заголовку message
socket.on("message", (message) => {
  console.log(message);
  const html = Mustache.render($messageTemplate, {
    username: message.username,
    message: message.text,
    createdAt: moment(message.createdAt).format("h:mm a"),
  }); //обрабатываем наш template с сообщением, добавляя все динамические значения, которые ему необходимы
  $messages.insertAdjacentHTML("beforeend", html); // вставялем template с сообщением в конец div'a 'messages'
  autoScroll();
});

// Делаем слушателя, которые мониторит данные приходящие с сервера по заголовку locationMessage
socket.on("locationMessage", (locationMessage) => {
  console.log(locationMessage);
  const html = Mustache.render($locationMessageTemplate, {
    username: locationMessage.username,
    url: locationMessage.url,
    createdAt: moment(locationMessage.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html); // вставялем template с сообщением в конец div'a 'messages'
});

// Делаем слушателя, которые мониторит данные приходящие с сервера по заголовку roomData
socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render($sidebarTemplate, {
    room,
    users,
  });
  document.querySelector("#sidebar").innerHTML = html;
});

$messageForm.addEventListener("submit", (e) => {
  e.preventDefault();

  //disable button
  $messageFormButton.setAttribute("disabled", "disabled");

  const message = e.target.elements.message.value;
  socket.emit("sendMessage", message, (errorMessage) => {
    //enable button and clear input
    $messageFormButton.removeAttribute("disabled");
    $messageFormInput.value = "";
    $messageFormInput.focus();

    if (errorMessage) {
      return console.log(errorMessage);
    }

    console.log("Message delivered");
  });
  /* 
    emit отправялет данные серверу, который слушает заголовок sendMessage 
    после названия действия, может быть сколько угодно аргументов.
    3 аргументом мы сделали колбэк, который возвращает статус отправки сообщения
  */
});

$sendLocationButton.addEventListener("click", (e) => {
  if (!navigator.geolocation) {
    return alert("Your browser not support this functionality");
  }

  //disable button
  $sendLocationButton.setAttribute("disabled", "disabled");

  navigator.geolocation.getCurrentPosition((position) => {
    const location = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
    };
    socket.emit("sendLocation", location, (errorMessage) => {
      if (errorMessage) {
        return console.log(errorMessage);
      }

      //enable button
      $sendLocationButton.removeAttribute("disabled");
      console.log("Location delivered");
    }); // emit отправялет данные серверу, который слушает заголовок sendLocation
  });
});

socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});
