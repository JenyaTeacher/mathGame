const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timerElement = document.getElementById('timer');
const gameOverScreen = document.getElementById('gameOver');
const finalTimeElement = document.getElementById('finalTime');
const restartBtn = document.getElementById('restartBtn');

let animationId;
let gameTime = 0;
let lastTime = 0;
let isGameOver = false;

// 1. АДАПТИВНІСТЬ ТА РОЗМІРИ
let scale = 1; // Глобальна змінна для масштабу

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Якщо ширина екрану менша за 768px, зменшуємо об'єкти на 40%
    scale = window.innerWidth < 768 ? 0.6 : 1;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 2. КЕРУВАННЯ (Клавіатура)
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };
window.addEventListener('keydown', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

// 3. КЕРУВАННЯ (Сенсорні кнопки)
function setupMobile(btnId, keyName) {
    const btn = document.getElementById(btnId);
    if(btn) {
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[keyName] = true; }, { passive: false });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[keyName] = false; }, { passive: false });
    }
}
setupMobile('btnUp', 'ArrowUp');
setupMobile('btnDown', 'ArrowDown');
setupMobile('btnLeft', 'ArrowLeft');
setupMobile('btnRight', 'ArrowRight');

// 4. ЗАВАНТАЖЕННЯ ЗОБРАЖЕНЬ (Тут можна змінити посилання на власні файли .png)
const playerImage = new Image();
const teacherImage = new Image();
const markerImage = new Image();

playerImage.src = "player.png"; 
teacherImage.src = "teacher.png";
markerImage.src = "marker.png";

let loadedImages = 0;
function checkLoad() {
    loadedImages++;
    if (loadedImages === 3) { init(); animate(performance.now()); }
}
playerImage.onload = teacherImage.onload = markerImage.onload = checkLoad;

// 5. ЕФЕКТИ МАЛЮВАННЯ
function applyShadow(glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 20; // Сила неонового світіння
    ctx.shadowOffsetX = 0; // Рівномірне світіння з усіх боків, без зміщення
    ctx.shadowOffsetY = 0;
}
function resetShadow() {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

// 6. ІГРОВІ ОБ'ЄКТИ
class Player {
constructor() {
        this.width = 70 * scale; 
        this.height = 150 * scale;
        this.x = canvas.width / 2; 
        this.y = canvas.height - (150 * scale);
        this.speed = 4 * scale; // Швидкість теж адаптуємо для балансу
    }
 draw() { 
        applyShadow('#00ffff'); // Неоново-блакитний для учня
        ctx.drawImage(playerImage, this.x - this.width/2, this.y - this.height/2, this.width, this.height); 
        resetShadow();
    }
    update() {
        if ((keys.ArrowUp || keys.w) && this.y - this.height/2 > 0) this.y -= this.speed;
        if ((keys.ArrowDown || keys.s) && this.y + this.height/2 < canvas.height) this.y += this.speed;
        if ((keys.ArrowLeft || keys.a) && this.x - this.width/2 > 0) this.x -= this.speed;
        if ((keys.ArrowRight || keys.d) && this.x + this.width/2 < canvas.width) this.x += this.speed;
        this.draw();
    }
}

class Teacher {
constructor() {
        this.width = 120 * scale; 
        this.height = 185 * scale;
        this.x = canvas.width / 2; 
        this.y = 80 * scale;
        this.speed = 1.3 * scale;
        this.lastShot = 0; this.interval = 1200;
    }
   draw() { 
        applyShadow('#ff003c'); // Неоново-червоний для вчителя
        ctx.drawImage(teacherImage, this.x - this.width/2, this.y - this.height/2, this.width, this.height); 
        resetShadow();
    }
    update(p, time) {
        const dx = p.x - this.x, dy = p.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) { this.x += (dx/dist)*this.speed; this.y += (dy/dist)*this.speed; }
        
        if (time - this.lastShot > this.interval) {
            markers.push(new Marker(this.x, this.y, Math.atan2(dy, dx)));
            this.lastShot = time;
            if (this.interval > 400) this.interval -= 15;
        }
        this.draw();
    }
}

class Marker {
 constructor(x, y, angle) {
        this.x = x; this.y = y; this.angle = angle;
        this.speed = 7 * scale; 
        this.w = 12 * scale; 
        this.h = 50 * scale;
    }
 draw() {
        ctx.save(); 
        ctx.translate(this.x, this.y); 
        ctx.rotate(this.angle-90);
        applyShadow('#ff003c'); // Неоново-червоний для маркерів
        ctx.drawImage(markerImage, -this.w/2, -this.h/2, this.w, this.h);
        resetShadow();
        ctx.restore();
    }
    update() {
        this.x += Math.cos(this.angle)*this.speed; this.y += Math.sin(this.angle)*this.speed;
        this.draw();
    }
}

// 7. ЛОГІКА ГРИ
let player, teacher, markers = [];

function init() {
    player = new Player(); teacher = new Teacher();
    markers = []; gameTime = 0; lastTime = performance.now();
    timerElement.innerText = "0";
}

function animate(time) {
    if (isGameOver) return;
    animationId = requestAnimationFrame(animate);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (time - lastTime >= 1000) { gameTime++; timerElement.innerText = gameTime; lastTime = time; }

    player.update(); teacher.update(player, time);

    for (let i = markers.length - 1; i >= 0; i--) {
        let m = markers[i]; m.update();
        if (m.x < -50 || m.x > canvas.width+50 || m.y < -50 || m.y > canvas.height+50) { markers.splice(i, 1); continue; }
        if (Math.hypot(player.x - m.x, player.y - m.y) < player.width/2) return endGame();
    }
if (Math.hypot(player.x - teacher.x, player.y - teacher.y) < (player.width/2 + teacher.width/2) - (15 * scale)) endGame();
}

function endGame() {
    isGameOver = true; cancelAnimationFrame(animationId);
    finalTimeElement.innerText = gameTime; gameOverScreen.style.display = 'block';
}

// Кнопка рестарту
if(restartBtn) {
    restartBtn.addEventListener('click', () => {
        isGameOver = false; gameOverScreen.style.display = 'none';
        init(); animate(performance.now());
    });
}