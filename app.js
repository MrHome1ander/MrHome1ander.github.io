// game parameters
const BALL_SPD = 0.5; // начальная скорость шара, зависит от высоты экрана
const BALL_SPD_MAX = 2; // максимальная скорость шара
const BALL_SPIN = 0.2; //закручивание шара(0- нет, 1 - высокая)
const BRICK_COLS = 14; //количество колонок кирпичей
const BRICK_GAP = 0.3; //расстояние между кирпичами, зависит от толщины стенок
const BRICK_ROWS = 8; //начальное количество строк кирпичей
const GAME_LIVES = 3; //начальные "жизни"
const KEY_SCORE = "breakout_highscore"; //ключ к локал счёту
const MARGIN = 6; //количество пустых ячеек сверху
const MAX_LEVEL = 10; // максимальный уровень (+2 строки кирпечей за уровень)
const MIN_BOUNCE_ANGLE = 30; //минимальный горизонтальный отскок в градусах
const PADDLE_SIZE = 1.5; //размер платформы кратный толщине стенки
const PADDLE_SPD = 0.5; // скорость платформы, зависит от ширины экрана
const PADDLE_W = 0.1; //ширины платформы
const PUP_BONUS = 50; //доп очки за получение улучшений
const PUP_CHANCE = 0.1; //шанс появления улучшения (0-нет, 1-высокий)
const PUP_SPD = 0.15; //скорость падения улучшения
const WALL = 0.02; //размер шара/стенки, зависит от ширины экрана

//цвета
const COLOR_BACKGROUND = "black";
const COLOR_BALL = "white";
const COLOR_PADDLE = "white";
const COLOR_TEXT = "white";
const COLOR_WALL = "grey";

//текст
const TEXT_FONT = "Lucida Console";
const TEXT_GAME_OVER = "Игра окончена";
const TEXT_LEVEL = "Уровень";
const TEXT_LIVES = "Жизни";
const TEXT_SCORE = "Счёт";
const TEXT_SCORE_HIGH = "Лучший счёт";
const TEXT_WIN = "!!!ВЫ ПОБЕДИЛИ!!!";


const Direction = {
    LEFT: 0,
    RIGHT: 1,
    STOP: 2
}

//улучшения
const PupType = {
    EXTENSION: { color: "dodgerblue", symbol: "=" },
    LIFE: { color: "hotpink", symbol: "+" },
    STICKY: { color: "forestgreen", symbol: "~" },
    SUPER: { color: "magenta", symbol: "s" }
}

//канвас
var canv = document.createElement("canvas");
document.body.appendChild(canv);
var ctx = canv.getContext("2d");

// звуки
var fxBrick = new Audio("sounds/brick.m4a");
var fxPaddle = new Audio("sounds/paddle.m4a");
var fxPowerup = new Audio("sounds/powerup.m4a");
var fxWall = new Audio("sounds/wall.m4a");

//игровые переменные
var ball, bricks = [], paddle, pups = [];
var gameOver, pupExtension, pupSticky, pupSuper, win;
var level, lives, score, scoreHigh;
var numBricks, textSize, touchX;

//размеры
var height, width, wall;
setDimensions();

//клавиши, тач
canv.addEventListener("touchcancel", touchCancel);
canv.addEventListener("touchend", touchEnd);
canv.addEventListener("touchmove", touchMove);
canv.addEventListener("touchstart", touchStart);
document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);
window.addEventListener("resize", setDimensions);

//игровой цикл
var timeDelta, timeLast;
requestAnimationFrame(loop);

function loop(timeNow) {
    if (!timeLast) {
        timeLast = timeNow;
    }

    //рассчёт разницы во времени
    timeDelta = (timeNow - timeLast) * 0.001; // в секундах
    timeLast = timeNow;

    //обновление
    if (!gameOver) {
        updatePaddle(timeDelta);
        updateBall(timeDelta);
        updateBricks(timeDelta);
        updatePups(timeDelta);
    }


    drawBackground();
    drawWalls();
    drawPups();
    drawPaddle();
    drawBricks();
    drawText();
    drawBall();

    //вызво нового цикла
    requestAnimationFrame(loop);
}

//обновление скорсоти шара
function applyBallSpeed(angle) {
    ball.xv = ball.spd * Math.cos(angle);
    ball.yv = -ball.spd * Math.sin(angle);
}

function createBricks() {

    //размер строк кирпичей
    let minY = wall;
    let maxY = ball.y - ball.h * 3.5;
    let totalSpaceY = maxY - minY;
    let totalRows = MARGIN + BRICK_ROWS + MAX_LEVEL * 2;
    let rowH = totalSpaceY / totalRows;
    let gap = wall * BRICK_GAP;
    let h = rowH - gap;
    textSize = rowH * MARGIN * 0.5;

    //размер колонок кирпичей
    let totalSpaceX = width - wall * 2;
    let colW = (totalSpaceX - gap) / BRICK_COLS;
    let w = colW - gap;

    //заполнение массива кирпичей
    bricks = [];
    let cols = BRICK_COLS;
    let rows = BRICK_ROWS + level * 2;
    let color, left, rank, rankHigh, score, spdMult, top;
    numBricks = cols * rows;
    rankHigh = rows * 0.5 - 1;
    for (let i = 0; i < rows; i++) {
        bricks[i] = [];
        rank = Math.floor(i * 0.5);
        score = (rankHigh - rank) * 2 + 1;
        spdMult = 1 + (rankHigh - rank) / rankHigh * (BALL_SPD_MAX - 1);
        color = getBrickColor(rank, rankHigh);
        top = wall + (MARGIN + i) * rowH;
        for (let j = 0; j < cols; j++) {
            left = wall + gap + j * colW;
            bricks[i][j] = new Brick(left, top, w, h, color, score, spdMult);
        }
    }
}
//фон
function drawBackground() {
    ctx.fillStyle = COLOR_BACKGROUND;
    ctx.fillRect(0, 0, width, height);
}
//шар
function drawBall() {
    ctx.fillStyle = pupSuper ? PupType.SUPER.color : COLOR_BALL;
    ctx.fillRect(ball.x - ball.w * 0.5, ball.y - ball.h * 0.5, ball.w, ball.h);
}
//кирпичи
function drawBricks() {
    for (let row of bricks) {
        for (let brick of row) {
            if (brick == null) {
                continue;
            }
            ctx.fillStyle = brick.color;
            ctx.fillRect(brick.left, brick.top, brick.w, brick.h);
        }
    }
}
//платформа
function drawPaddle() {
    ctx.fillStyle = pupSticky ? PupType.STICKY.color : COLOR_PADDLE;
    ctx.fillRect(paddle.x - paddle.w * 0.5, paddle.y - paddle.h * 0.5, paddle.w, paddle.h);
}
//улучшения
function drawPups() {
    ctx.lineWidth = wall * 0.35;
    for (let pup of pups) {
        ctx.fillStyle = pup.type.color;
        ctx.strokeStyle = pup.type.color;
        ctx.strokeRect(pup.x - pup.w * 0.5, pup.y - pup.h * 0.5, pup.w, pup.h);
        ctx.font = "bold " + pup.h + "px " + TEXT_FONT;
        ctx.textAlign = "center";
        ctx.fillText(pup.type.symbol, pup.x, pup.y);
    }
}
//текст
function drawText() {
    ctx.fillStyle = COLOR_TEXT;

    let labelSize = textSize * 0.5;
    let margin = wall * 2;
    let maxWidth = width - margin * 2;
    let maxWidth1 = maxWidth * 0.27;
    let maxWidth2 = maxWidth * 0.2;
    let maxWidth3 = maxWidth * 0.2;
    let maxWidth4 = maxWidth * 0.27;
    let x1 = margin;
    let x2 = width * 0.4;
    let x3 = width * 0.6;
    let x4 = width - margin;
    let yLabel = wall + labelSize;
    let yValue = yLabel + textSize * 0.9;

    //ярлыки
    ctx.font = labelSize + "px " + TEXT_FONT;
    ctx.textAlign = "left";
    ctx.fillText(TEXT_SCORE, x1, yLabel, maxWidth1);
    ctx.textAlign = "center";
    ctx.fillText(TEXT_LIVES, x2, yLabel, maxWidth2);
    ctx.fillText(TEXT_LEVEL, x3, yLabel, maxWidth3);
    ctx.textAlign = "right";
    ctx.fillText(TEXT_SCORE_HIGH, x4, yLabel, maxWidth4);

    //значения
    ctx.font = textSize + "px " + TEXT_FONT;
    ctx.textAlign = "left";
    ctx.fillText(score, x1, yValue, maxWidth1);
    ctx.textAlign = "center";
    ctx.fillText(lives + "/" + GAME_LIVES, x2, yValue, maxWidth2);
    ctx.fillText(level, x3, yValue, maxWidth3);
    ctx.textAlign = "right";
    ctx.fillText(scoreHigh, x4, yValue, maxWidth4);

    //конец игры
    if (gameOver) {
        let text = win ? TEXT_WIN : TEXT_GAME_OVER;
        ctx.font = textSize + "px " + TEXT_FONT;
        ctx.textAlign = "center";
        ctx.fillText(text, width * 0.5, paddle.y - textSize, maxWidth);
    }
}
//стены/потолок
function drawWalls() {
    let hwall = wall * 0.5;
    ctx.lineWidth = wall;
    ctx.strokeStyle = COLOR_WALL;
    ctx.beginPath();
    ctx.moveTo(hwall, height);
    ctx.lineTo(hwall, hwall);
    ctx.lineTo(width - hwall, hwall);
    ctx.lineTo(width - hwall, height);
    ctx.stroke();
}

//красный - 0, оранжевый - 0.33, жёлтый - 0.67, зленый - 1
function getBrickColor(rank, highestRank) {
    let fraction = rank / highestRank;
    let r, g, b = 0;

    //переход красный в оранжевый в жёлтый (увеличение зелёного)
    if (fraction <= 0.67) {
        r = 255;
        g = 255 * fraction / 0.67;
    }

    //переход жёлтого в зеленый (уменьшение красного)
    else {
        r = 255 * (1 - fraction) / 0.33;
        g = 255;
    }

    //возвращение цвета
    return "rgb(" + r + ", " + g + ", " + b + ")";
}
//нажатие клавиш
function keyDown(ev) {
    switch (ev.keyCode) {
        case 32: //пробел (запуск шара)
            serve();
            if (gameOver) {
                newGame();
            }
            break;
        case 37: //стрелка влево (платформа влево)
            movePaddle(Direction.LEFT);
            break;
        case 39: //стрелка вправо (платформа вправо)
            movePaddle(Direction.RIGHT);
            break;
    }
}
//отжатие клавиш
function keyUp(ev) {
    switch (ev.keyCode) {
        case 37: // стрелка влево (стоп)
        case 39: //стрелка вправо (стоп)
            movePaddle(Direction.STOP);
            break;
    }
}
//движение латформы
function movePaddle(direction) {
    switch (direction) {
        case Direction.LEFT:
            paddle.xv = -paddle.spd;
            break;
        case Direction.RIGHT:
            paddle.xv = paddle.spd;
            break;
        case Direction.STOP:
            paddle.xv = 0;
            break;
    }
}

function newBall() {
    pupExtension = false;
    pupSticky = false;
    pupSuper = false;
    paddle = new Paddle();
    ball = new Ball();
}

function newGame() {
    gameOver = false;
    level = 0;
    lives = GAME_LIVES;
    score = 0;
    win = false;

    //получение счёта из локал
    let scoreStr = localStorage.getItem(KEY_SCORE);
    if (scoreStr == null) {
        scoreHigh = 0;
    } else {
        scoreHigh = parseInt(scoreStr);
    }

    //новая игра
    newLevel();
}

function newLevel() {
    pups = [];
    touchX = null;
    newBall();
    createBricks();
}

function outOfBounds() {
    lives--;
    if (lives == 0) {
        gameOver = true;
    }
    newBall();
}
//запуск шара
function serve() {

    //шар уже в движении
    if (ball.yv != 0) {
        return false;
    }

    //рандомный угол (не меньше, чем угол отскока)
    let minBounceAngle = MIN_BOUNCE_ANGLE / 180 * Math.PI; // в радианах
    let range = Math.PI - minBounceAngle * 2;
    let angle = Math.random() * range + minBounceAngle;
    applyBallSpeed(pupSticky ? Math.PI / 2 : angle);
    fxPaddle.play();
    return true;
}

function setDimensions() {
    height = window.innerHeight;
    width = window.innerWidth;
    wall = WALL * (height < width ? height : width);
    canv.width = width;
    canv.height = height;
    ctx.textBaseline = "middle";
    newGame();
}
// закручивание шара
function spinBall() {
    let upwards = ball.yv < 0;
    let angle = Math.atan2(-ball.yv, ball.xv);
    angle += (Math.random() * Math.PI / 2 - Math.PI / 4) * BALL_SPIN;

    //минимальный угол отскока
    let minBounceAngle = MIN_BOUNCE_ANGLE / 180 * Math.PI; //в радианах
    if (upwards) {
        if (angle < minBounceAngle) {
            angle = minBounceAngle;
        } else if (angle > Math.PI - minBounceAngle) {
            angle = Math.PI - minBounceAngle;
        }
    } else {
        if (angle > -minBounceAngle) {
            angle = -minBounceAngle;
        } else if (angle < -Math.PI + minBounceAngle) {
            angle = -Math.PI + minBounceAngle;
        }
    }
    applyBallSpeed(angle);
}

function touchCancel(ev) {
    touchX = null;
    movePaddle(Direction.STOP);
}

function touchEnd(ev) {
    touchX = null;
    movePaddle(Direction.STOP);
}

function touchMove(ev) {
    touchX = ev.touches[0].clientX;
}

function touchStart(ev) {
    if (serve()) {
        if (gameOver) {
            newGame();
        }
        return;
    }
    touchX = ev.touches[0].clientX;
}

function updateBall(delta) {
    ball.x += ball.xv * delta;
    ball.y += ball.yv * delta;

    //отскок шара от стен/потолка
    if (ball.x < wall + ball.w * 0.5) {
        ball.x = wall + ball.w * 0.5;
        ball.xv = -ball.xv;
        fxWall.play();
        spinBall();
    } else if (ball.x > width - wall - ball.w * 0.5) {
        ball.x = width - wall - ball.w * 0.5;
        ball.xv = -ball.xv;
        fxWall.play();
        spinBall();
    } else if (ball.y < wall + ball.h * 0.5) {
        ball.y = wall + ball.h * 0.5;
        ball.yv = -ball.yv;
        fxWall.play();
        spinBall();
    }

    //отскок от платформы
    if (ball.y > paddle.y - paddle.h * 0.5 - ball.h * 0.5
        && ball.y < paddle.y + paddle.h * 0.5
        && ball.x > paddle.x - paddle.w * 0.5 - ball.w * 0.5
        && ball.x < paddle.x + paddle.w * 0.5 + ball.w * 0.5
    ) {
        ball.y = paddle.y - paddle.h * 0.5 - ball.h * 0.5;
        if (pupSticky) {
            ball.xv = 0;
            ball.yv = 0;
        } else {
            ball.yv = -ball.yv;
            spinBall();
        }
        fxPaddle.play();
    }

    //не отбили платформйй
    if (ball.y > height) {
        outOfBounds();
    }
}

function updateBricks(delta) {

    //проверка столкновения шара
    OUTER: for (let i = 0; i < bricks.length; i++) {
        for (let j = 0; j < BRICK_COLS; j++) {
            if (bricks[i][j] != null && bricks[i][j].intersect(ball)) {
                updateScore(bricks[i][j].score);
                ball.setSpeed(bricks[i][j].spdMult);

                //шар на угол платформы
                if (ball.yv < 0) { // снизу вверх
                    ball.y = bricks[i][j].bot + ball.h * 0.5;
                } else { // вниз
                    ball.y = bricks[i][j].top - ball.h * 0.5;
                }

                //создание улучшения
                if (Math.random() <= PUP_CHANCE) {
                    let px = bricks[i][j].left + bricks[i][j].w / 2;
                    let py = bricks[i][j].top + bricks[i][j].h / 2;
                    let pSize = bricks[i][j].w / 2;
                    let pKeys = Object.keys(PupType);
                    let pKey = pKeys[Math.floor(Math.random() * pKeys.length)];
                    pups.push(new PowerUp(px, py, pSize, PupType[pKey]));
                }

                // отскок шара и удаление блока
                if (!pupSuper) {
                    ball.yv = -ball.yv;
                }
                bricks[i][j] = null;
                numBricks--;
                fxBrick.play();
                spinBall();
                break OUTER;
            }
        }
    }

    //следующий уровень
    if (numBricks == 0) {
        if (level < MAX_LEVEL) {
            level++;
            newLevel();
        } else {
            gameOver = true;
            win = true;
            newBall();
        }
    }
}

function updatePaddle(delta) {

    //касания
    if (touchX != null) {
        if (touchX > paddle.x + wall) {
            movePaddle(Direction.RIGHT);
        } else if (touchX < paddle.x - wall) {
            movePaddle(Direction.LEFT);
        } else {
            movePaddle(Direction.STOP);
        }
    }

    //движения платформы
    let lastPaddleX = paddle.x;
    paddle.x += paddle.xv * delta;

    //стены - границы
    if (paddle.x < wall + paddle.w * 0.5) {
        paddle.x = wall + paddle.w * 0.5;
    } else if (paddle.x > width - wall - paddle.w * 0.5) {
        paddle.x = width - wall - paddle.w * 0.5;
    }

    //статичное положение шара на платформе
    if (ball.yv == 0) {
        ball.x += paddle.x - lastPaddleX;
    }

    //сбор улучшений
    for (let i = pups.length - 1; i >= 0; i--) {
        if (
            pups[i].x + pups[i].w * 0.5 > paddle.x - paddle.w * 0.5
            && pups[i].x - pups[i].w * 0.5 < paddle.x + paddle.w * 0.5
            && pups[i].y + pups[i].h * 0.5 > paddle.y - paddle.h * 0.5
            && pups[i].y - pups[i].h * 0.5 < paddle.y + paddle.h * 0.5
        ) {
            switch (pups[i].type) {
                case PupType.EXTENSION:
                    //х2 размер платформы
                    if (pupExtension) {
                        score += PUP_BONUS;
                    } else {
                        pupExtension = true;
                        paddle.w *= 2;
                    }
                    break;
                case PupType.LIFE:
                    // дополнительная жизнь
                    lives++;
                    break;
                case PupType.STICKY:
                    if (pupSticky) {
                        score += PUP_BONUS;
                    } else {
                        pupSticky = true;
                    }
                    break;
                case PupType.SUPER:
                    if (pupSuper) {
                        score += PUP_BONUS;
                    } else {
                        pupSuper = true;
                    }
                    break;
            }
            pups.splice(i, 1);
            fxPowerup.play();
        }
    }
}

function updatePups(delta) {
    for (let i = pups.length - 1; i >= 0; i--) {
        pups[i].y += pups[i].yv * delta;

        //удаление не пойманных улучшений
        if (pups[i].y - pups[i].h * 0.5 > height) {
            pups.splice(i, 1);
        }
    }
}

function updateScore(brickScore) {
    score += brickScore;

    //проверка лучшего счёта
    if (score > scoreHigh) {
        scoreHigh = score;
        localStorage.setItem(KEY_SCORE, scoreHigh);
    }
}

function Ball() {
    this.w = wall;
    this.h = wall;
    this.x = paddle.x;
    this.y = paddle.y - paddle.h / 2 - this.h / 2;
    this.spd = BALL_SPD * height;
    this.xv = 0;
    this.yv = 0;

    this.setSpeed = function (spdMult) {
        this.spd = Math.max(this.spd, BALL_SPD * height * spdMult);
    }
}

function Brick(left, top, w, h, color, score, spdMult) {
    this.w = w;
    this.h = h;
    this.bot = top + h;
    this.left = left;
    this.right = left + w;
    this.top = top;
    this.color = color;
    this.score = score;
    this.spdMult = spdMult;

    this.intersect = function (ball) {
        let bBot = ball.y + ball.h * 0.5;
        let bLeft = ball.x - ball.w * 0.5;
        let bRight = ball.x + ball.w * 0.5;
        let bTop = ball.y - ball.h * 0.5;
        return this.left < bRight
            && bLeft < this.right
            && this.bot > bTop
            && bBot > this.top;
    }
}

function Paddle() {
    this.w = PADDLE_W * width;
    this.h = wall * PADDLE_SIZE;
    this.x = width / 2;
    this.y = height - wall * 3.5 + this.h / 2;
    this.spd = PADDLE_SPD * width;
    this.xv = 0;
}

function PowerUp(x, y, size, type) {
    this.w = size;
    this.h = size;
    this.x = x;
    this.y = y;
    this.type = type;
    this.yv = PUP_SPD * height;
}