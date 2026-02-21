// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Класс для управления данными пользователя
class UserData {
    constructor() {
        this.userId = tg.initDataUnsafe.user?.id;
        this.loadUserData();
        this.loadFromServer();
    }

    loadUserData() {
        const savedData = localStorage.getItem(`user_${this.userId}`);
        if (savedData) {
            this.data = JSON.parse(savedData);
        } else {
            this.data = {
                username: tg.initDataUnsafe.user?.first_name || 'Пользователь',
                avatar: tg.initDataUnsafe.user?.photo_url || 'https://via.placeholder.com/40',
                balance: 0,
                completedTasks: [],
                referrals: 0,
                lastWithdrawals: this.generateInitialWithdrawals()
            };
        }
    }

    async loadFromServer() {
        try {
            // Отправляем запрос в бота для получения актуальных данных
            tg.sendData(JSON.stringify({
                action: 'get_user_data'
            }));
        } catch (e) {
            console.log('Ошибка загрузки данных с сервера');
        }
    }

    generateInitialWithdrawals() {
        const names = ['Алексей', 'Мария', 'Дмитрий', 'Елена', 'Сергей', 'Анна', 'Иван', 'Ольга'];
        const withdrawals = [];
        
        for (let i = 0; i < 5; i++) {
            const name = names[Math.floor(Math.random() * names.length)];
            const lastName = names[Math.floor(Math.random() * names.length)];
            const amount = (Math.floor(Math.random() * 5) + 1) * 1000;
            
            withdrawals.push({
                user: `${name[0]}*** ${lastName[0]}******`,
                amount: amount
            });
        }
        
        return withdrawals;
    }

    saveUserData() {
        localStorage.setItem(`user_${this.userId}`, JSON.stringify(this.data));
    }

    updateBalance(amount) {
        this.data.balance += amount;
        this.saveUserData();
        this.updateUI();
    }

    completeTask(taskId) {
        if (!this.data.completedTasks.includes(taskId)) {
            this.data.completedTasks.push(taskId);
            this.saveUserData();
            this.updateUI();
        }
    }

    addWithdrawal(user, amount) {
        this.data.lastWithdrawals.unshift({
            user: user,
            amount: amount
        });
        
        if (this.data.lastWithdrawals.length > 5) {
            this.data.lastWithdrawals.pop();
        }
        
        this.saveUserData();
        this.updateUI();
    }

    updateUI() {
        document.getElementById('userName').textContent = this.data.username;
        document.getElementById('userAvatar').src = this.data.avatar;
        document.getElementById('userBalance').textContent = this.data.balance.toLocaleString() + ' ₽';
        
        this.renderWithdrawals();
        this.renderTasks();
    }

    renderWithdrawals() {
        const list = document.getElementById('withdrawalsList');
        list.innerHTML = this.data.lastWithdrawals.map(w => `
            <div class="withdrawal-item">
                <span class="withdrawal-user">${w.user}</span>
                <span class="withdrawal-amount">${w.amount.toLocaleString()} ₽</span>
            </div>
        `).join('');
    }

    renderTasks() {
        const tasksList = document.getElementById('tasksList');
        tasksList.innerHTML = tasks.map(task => {
            const isCompleted = this.data.completedTasks.includes(task.id);
            
            if (task.id === 'referral') {
                // Показываем прогресс рефералов
                const progress = this.data.referrals || 0;
                const isReferralCompleted = progress >= 20;
                
                return `
                    <div class="task-item">
                        <div class="task-info">
                            <div class="task-title">${task.title}</div>
                            <div class="task-progress">
                                👥 Приглашено: ${progress}/20
                                ${progress > 0 ? `
                                    <div style="background: #2a2a2a; height: 4px; border-radius: 2px; margin-top: 5px;">
                                        <div style="background: #00ff00; width: ${(progress/20)*100}%; height: 4px; border-radius: 2px;"></div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <span class="task-price">+${task.reward} ₽</span>
                        <button class="task-button ${isReferralCompleted ? 'completed' : ''}" disabled>
                            ${isReferralCompleted ? 'Выполнено' : 'В боте'}
                        </button>
                    </div>
                `;
            }
            
            return `
                <div class="task-item">
                    <div class="task-info">
                        <div class="task-title">${task.title}</div>
                    </div>
                    <span class="task-price">+${task.reward} ₽</span>
                    <button 
                        class="task-button ${isCompleted ? 'completed' : ''}" 
                        onclick="handleTask('${task.id}', '${task.channel}')"
                        ${isCompleted ? 'disabled' : ''}
                    >
                        ${isCompleted ? 'Выполнено' : 'Выполнить'}
                    </button>
                </div>
            `;
        }).join('');
    }

    showNotification(text) {
        const notification = document.getElementById('notification');
        notification.textContent = text;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    updateFromServer(data) {
        if (data) {
            // Обновляем баланс
            if (data.balance !== undefined) {
                this.data.balance = data.balance;
            }
            
            // Обновляем количество рефералов
            if (data.referrals !== undefined) {
                this.data.referrals = data.referrals;
            }
            
            // Обновляем выполненные задания
            if (data.tasks) {
                data.tasks.forEach(task => {
                    if (task.completed && !this.data.completedTasks.includes(task.id)) {
                        this.data.completedTasks.push(task.id);
                    }
                    // Обновляем прогресс рефералов из задачи
                    if (task.id === 'referral' && task.progress !== undefined) {
                        this.data.referrals = task.progress;
                    }
                });
            }
            
            this.saveUserData();
            this.updateUI();
        }
    }
}

// Задания
const tasks = [
    {
        id: 'channel1',
        title: 'Подписаться на канал 1',
        reward: 300,
        channel: '@arbitrazh65'
    },
    {
        id: 'channel2',
        title: 'Подписаться на канал 2',
        reward: 300,
        channel: '@channel2'
    },
    {
        id: 'channel3',
        title: 'Подписаться на канал 3',
        reward: 300,
        channel: '@channel3'
    },
    {
        id: 'channel4',
        title: 'Подписаться на канал 4',
        reward: 300,
        channel: '@channel4'
    },
    {
        id: 'channel5',
        title: 'Подписаться на канал 5',
        reward: 299,
        channel: '@channel5'
    },
    {
        id: 'referral',
        title: 'Пригласить 20 друзей',
        reward: 6000
    }
];

// Инициализация пользователя
const user = new UserData();

// Функции для работы с модальным окном вывода
function showWithdrawModal() {
    if (user.data.balance < 1500) {
        user.showNotification('Минимальная сумма для вывода: 1500 ₽');
        return;
    }
    document.getElementById('withdrawModal').style.display = 'block';
}

function closeWithdrawModal() {
    document.getElementById('withdrawModal').style.display = 'none';
    document.getElementById('withdrawForm').innerHTML = '';
    document.getElementById('withdrawMessage').innerHTML = '';
}

function showWithdrawMethod(method) {
    const form = document.getElementById('withdrawForm');
    
    if (method === 'card') {
        form.innerHTML = `
            <input type="text" placeholder="Номер карты" id="cardNumber">
            <button onclick="processWithdraw('card')" class="withdraw-btn" style="margin-top: 12px;">Подтвердить</button>
        `;
    } else {
        form.innerHTML = `
            <input type="text" placeholder="Номер телефона" id="phoneNumber">
            <button onclick="processWithdraw('sbp')" class="withdraw-btn" style="margin-top: 12px;">Подтвердить</button>
        `;
    }
}

function processWithdraw(method) {
    let value = method === 'card' 
        ? document.getElementById('cardNumber')?.value 
        : document.getElementById('phoneNumber')?.value;
    
    if (!value) {
        user.showNotification('Заполните все поля');
        return;
    }
    
    // Отправляем запрос на вывод в бота
    tg.sendData(JSON.stringify({
        action: 'withdraw',
        amount: user.data.balance,
        method: method,
        details: value
    }));
    
    const message = document.getElementById('withdrawMessage');
    message.innerHTML = 'Запрос отправлен. Средства поступят в течение 8 часов';
    message.style.background = '#ffd700';
    message.style.color = '#000';
    
    setTimeout(closeWithdrawModal, 3000);
}

// Обработка заданий
function handleTask(taskId, channel) {
    const task = tasks.find(t => t.id === taskId);
    
    if (!task || user.data.completedTasks.includes(taskId)) {
        return;
    }
    
    // Открываем канал в Telegram
    tg.openTelegramLink(`https://t.me/${channel.replace('@', '')}`);
    
    // Отправляем запрос на проверку подписки
    tg.sendData(JSON.stringify({
        action: 'check_subscription',
        channel: channel,
        channel_id: taskId
    }));
    
    user.showNotification('Проверяем подписку...');
}

// Обработка данных от бота
tg.onEvent('web_app_data', (event) => {
    try {
        const data = JSON.parse(event.data);
        
        if (data.status === 'success') {
            if (data.subscribed) {
                if (data.bonus) {
                    user.updateBalance(data.bonus);
                    user.showNotification(`✅ Задание выполнено! +${data.bonus} ₽`);
                }
                user.loadFromServer(); // Обновляем данные
            } else if (data.subscribed === false) {
                user.showNotification('❌ Вы не подписаны на канал. Подпишитесь и попробуйте снова');
            }
        } else if (data.status === 'error') {
            user.showNotification('❌ ' + data.message);
        }
        
        // Обновляем данные пользователя из ответа
        user.updateFromServer(data);
        
    } catch (e) {
        console.log('Ошибка обработки данных от бота:', e);
    }
});

// Закрытие модального окна при клике вне его
window.onclick = function(event) {
    const modal = document.getElementById('withdrawModal');
    if (event.target === modal) {
        closeWithdrawModal();
    }
}

// Инициализация интерфейса
user.updateUI();

// Периодически обновляем данные с сервера (каждые 30 секунд)
setInterval(() => {
    user.loadFromServer();
}, 30000);