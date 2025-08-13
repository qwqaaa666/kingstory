// src/App.js

import { saveGameData, loadGameData } from './utils/storage.js';
import { performCheck, calculateCombatDamage } from './utils/math.js';
import { renderCharacterSheet } from './components/CharacterSheet.js';
import { renderEvent, clearChoices } from './components/EventDisplay.js';

// 游戏核心数据
let game = {
    player: {},
    stage: 1,
    gameOver: false,
    job: null,
    inventory: [],
    stamina: 100,
    maxStamina: 100,
    lastActionTime: Date.now(),
    uniqueEventsTriggered: {}, // 使用对象来追踪已触发的事件，防止重复
    month: 1,
    statusEffects: {},
    questProgress: {}, // 追踪任务进度
    lastEventId: 'start_game' // 新增：追踪上一个事件，用于返回
};

// 游戏数据
let gameData = {
    events: null,
    monsters: null,
    items: null,
    stories: null
};

// UI 元素引用
const startScreen = document.getElementById('start-screen');
const attributeScreen = document.getElementById('attribute-screen');
const gameScreen = document.getElementById('game-screen');
const endingScreen = document.getElementById('ending-screen');

const pointsLeftSpan = document.getElementById('points-left');
const attributeList = document.getElementById('attribute-list');
const confirmAttributesBtn = document.getElementById('confirm-attributes-btn');
const newGameBtn = document.getElementById('new-game-btn');
const loadGameBtn = document.getElementById('load-game-btn');
const saveGameBtn = document.getElementById('save-game-btn');
const returnToMenuBtn = document.getElementById('return-to-menu-btn');

const eventTextP = gameScreen.querySelector('.event-text');
const choicesArea = document.getElementById('choices-area');
const inventoryList = document.getElementById('inventory-list');
const monthDisplay = document.getElementById('month-display');
const itemTooltip = document.getElementById('item-tooltip');
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const sidebar = gameScreen.querySelector('.sidebar');
const chapterTitleElement = document.getElementById('chapter-title');

/**
 * 创建一个全新的玩家角色数据。
 * @returns {object} 新玩家对象
 */
function createNewPlayer() {
    return {
        attributes: {
            耐力: 0,
            精神: 0,
            体态: 0,
            运气: 0,
            异化: 0,
            学习: 0,
            体力: 0,
            力量: 0,
            感知: 0,
            情感: 0,
            抗性: 0 // 新增抗性属性
        },
        pointsLeft: 50,
        level: 1,
        exp: 0,
        nextLevelExp: 25,
        maxHP: 50,
        currentHP: 50,
        age: 1,
        dynamicMaxStamina: 100,
        stamina: 100,
        equippedWeapon: null
    };
}

/**
 * 切换屏幕显示。
 * @param {string} screenId 要激活的屏幕ID。
 */
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

/**
 * 异步加载所有游戏数据文件。
 */
async function loadGameDataFiles() {
    try {
        const [eventsRes, monstersRes, itemsRes, storiesRes] = await Promise.all([
            fetch('src/data/events.json'),
            fetch('src/data/monsters.json'),
            fetch('src/data/items.json'),
            fetch('src/data/stories.json')
        ]);

        gameData.events = await eventsRes.json();
        gameData.monsters = await monstersRes.json();
        gameData.items = await itemsRes.json();
        gameData.stories = await storiesRes.json();

        console.log('所有游戏数据已加载。');
    } catch (e) {
        console.error('加载游戏数据文件失败，请确保文件路径正确:', e);
        eventTextP.textContent = "游戏数据加载失败，请检查文件是否完整。";
    }
}

/**
 * 初始化游戏，检查是否有存档并更新主菜单按钮状态。
 */
async function initGame() {
    await loadGameDataFiles();
    const savedData = loadGameData();
    loadGameBtn.disabled = !savedData;
    switchScreen('start-screen');
}

/**
 * 渲染属性分配界面，用于玩家初始化角色属性。
 */
function renderAttributeScreen() {
    game.player = createNewPlayer();
    pointsLeftSpan.textContent = game.player.pointsLeft;
    attributeList.innerHTML = '';
    const attributes = Object.keys(game.player.attributes);
    attributes.forEach(attr => {
        const item = document.createElement('div');
        item.className = 'attribute-item';
        item.innerHTML = `
            <h4>${attr}</h4>
            <div class="attribute-controls">
                <button class="minus-10-btn" data-attr="${attr}" disabled>-10</button>
                <button class="minus-btn" data-attr="${attr}" disabled>-</button>
                <span class="value" id="attr-value-${attr}">${game.player.attributes[attr]}</span>
                <button class="plus-btn" data-attr="${attr}" ${game.player.pointsLeft === 0 ? 'disabled' : ''}>+</button>
                <button class="plus-10-btn" data-attr="${attr}" ${game.player.pointsLeft < 10 ? 'disabled' : ''}>+10</button>
            </div>
        `;
        attributeList.appendChild(item);
    });
    updateAttributeControls();
}

/**
 * 更新属性分配界面按钮状态和剩余点数显示。
 */
function updateAttributeControls() {
    pointsLeftSpan.textContent = game.player.pointsLeft;
    confirmAttributesBtn.disabled = game.player.pointsLeft !== 0;

    document.querySelectorAll('.plus-btn').forEach(btn => {
        const attr = btn.dataset.attr;
        btn.disabled = game.player.pointsLeft === 0 || game.player.attributes[attr] >= 100;
    });

    document.querySelectorAll('.minus-btn').forEach(btn => {
        const attr = btn.dataset.attr;
        btn.disabled = game.player.attributes[attr] === 0;
    });

    document.querySelectorAll('.plus-10-btn').forEach(btn => {
        const attr = btn.dataset.attr;
        btn.disabled = game.player.pointsLeft < 10 || game.player.attributes[attr] > 90;
    });

    document.querySelectorAll('.minus-10-btn').forEach(btn => {
        const attr = btn.dataset.attr;
        btn.disabled = game.player.attributes[attr] < 10;
    });
}

// 属性分配按钮事件监听
attributeList.addEventListener('click', (e) => {
    const attr = e.target.dataset.attr;
    if (!attr) return;

    const currentValue = game.player.attributes[attr];
    const pointsLeft = game.player.pointsLeft;
    let change = 0;

    if (e.target.classList.contains('plus-btn')) {
        change = 1;
        if (pointsLeft < change || currentValue + change > 100) return;
    } else if (e.target.classList.contains('minus-btn')) {
        change = -1;
        if (currentValue + change < 0) return;
    } else if (e.target.classList.contains('plus-10-btn')) {
        change = 10;
        if (pointsLeft < change || currentValue + change > 100) return;
    } else if (e.target.classList.contains('minus-10-btn')) {
        change = -10;
        if (currentValue + change < 0) return;
    }

    if (change !== 0) {
        game.player.attributes[attr] += change;
        game.player.pointsLeft -= change;
        document.getElementById(`attr-value-${attr}`).textContent = game.player.attributes[attr];
        updateAttributeControls();
    }
});

/**
 * 开始游戏，初始化UI并进入第一个事件。
 */
function startGame() {
    game.maxStamina = 100 + Math.floor((game.player.attributes.体力 + game.player.attributes.耐力) / 5);
    game.stamina = game.maxStamina;
    game.lastActionTime = Date.now();
    updateUI();
    setChapterTitle(game.stage);
    nextEvent("start_game");
}

/**
 * 根据阶段设置章节标题。
 * @param {number} stage 阶段ID。
 */
function setChapterTitle(stage) {
    let title = '';
    switch (stage) {
        case 1:
            title = "序章：被遗忘的血脉 (1-15岁)";
            break;
        case 2:
            title = "第一幕：觉醒与初探 (15-23岁)";
            break;
        case 3:
            title = "第二幕：寻觅与迷失 (23-38岁)";
            break;
        case 4:
            title = "第三幕：镜中之王 (38岁之后)";
            break;
        case 5:
            title = "终章：自我之镜 (最终决战)";
            break;
        default:
            title = "未知章节";
            break;
    }
    if (chapterTitleElement) {
        chapterTitleElement.textContent = title;
    }
}

/**
 * 更新游戏主界面所有信息 (角色信息、背包、月份)。
 */
function updateUI() {
    renderCharacterSheet(game.player, game.job, game.stage, game.stamina, game.maxStamina, game.questProgress);
    inventoryList.innerHTML = game.inventory.map(item => `<li data-item="${item}">${gameData.items[item]?.name || item}</li>`).join('');
    setupInventoryTooltips();
    if (monthDisplay) {
        monthDisplay.textContent = `年龄: ${game.player.age} 岁, 月份: ${game.month}`;
    }
}

/**
 * 设置背包物品的鼠标悬停提示功能。
 */
function setupInventoryTooltips() {
    document.querySelectorAll('#inventory-list li').forEach(itemElement => {
        const itemName = itemElement.dataset.item;
        const itemData = gameData.items[itemName];

        if (itemData) {
            itemElement.addEventListener('mouseover', (e) => {
                showItemTooltip(itemData, e.clientX, e.clientY);
            });
            itemElement.addEventListener('mousemove', (e) => {
                showItemTooltip(itemData, e.clientX, e.clientY);
            });
            itemElement.addEventListener('mouseout', hideItemTooltip);
        }
    });
}

/**
 * 显示物品提示框。
 * @param {object} itemData 物品数据。
 * @param {number} x 鼠标X坐标。
 * @param {number} y 鼠标Y坐标。
 */
function showItemTooltip(itemData, x, y) {
    itemTooltip.innerHTML = `
        <h3>${itemData.name}</h3>
        <p>类型: ${itemData.type}</p>
        <p>${itemData.description}</p>
        ${itemData.skillEffect ? `<p>技能效果: ${itemData.skillEffect.description}</p>` : ''}
    `;
    itemTooltip.style.display = 'block';
    itemTooltip.style.left = `${x + 15}px`;
    itemTooltip.style.top = `${y + 15}px`;
}

/**
 * 隐藏物品提示框。
 */
function hideItemTooltip() {
    itemTooltip.style.display = 'none';
}

/**
 * 恢复体力。
 */
function restoreStamina() {
    const now = Date.now();
    const elapsedTime = now - game.lastActionTime;
    let staminaToRestore = Math.floor(elapsedTime / 10000);
    game.stamina = Math.min(game.maxStamina, game.stamina + staminaToRestore);
    game.lastActionTime = now;
}

/**
 * 检查年龄并触发章节过渡。
 */
function checkAgeTransition() {
    if (game.player.age >= 15 && game.stage === 1) {
        game.stage = 2;
        eventTextP.textContent += "\n\n【章节过渡】你已步入青年，第一幕：觉醒与初探，开始了！";
        setChapterTitle(game.stage);
        renderContinueButton();
        return true;
    } else if (game.player.age >= 23 && game.stage === 2) {
        game.stage = 3;
        eventTextP.textContent += "\n\n【章节过渡】你步入了成熟期，第二幕：寻觅与迷失，开始了！";
        setChapterTitle(game.stage);
        renderContinueButton();
        return true;
    } else if (game.player.age >= 38 && game.stage === 3) {
        game.stage = 4;
        eventTextP.textContent += "\n\n【章节过渡】你已步入最终阶段，第三幕：镜中之王，开始了！";
        setChapterTitle(game.stage);
        renderContinueButton();
        return true;
    }
    return false;
}

/**
 * 渲染“继续前进”按钮。
 */
function renderContinueButton() {
    clearChoices(choicesArea);
    const button = document.createElement('button');
    button.textContent = "继续前进";
    button.addEventListener('click', nextEvent);
    choicesArea.appendChild(button);
}

/**
 * 获取下一个事件。
 * @param {string} eventId 指定的事件ID (可选)。
 */
function nextEvent(eventId = null) {
    if (game.gameOver) {
        return;
    }

    restoreStamina();
    updateUI();

    if (checkAgeTransition()) {
        return;
    }
    
    // 增加年龄和月份
    if (!eventId) {
        game.month++;
        if (game.month > 12) {
            game.month = 1;
            game.player.age++;
        }
    }


    clearChoices(choicesArea);
    let currentEvent = null;

    if (eventId && gameData.events[eventId]) {
        currentEvent = gameData.events[eventId];
    } else {
        const poolId = game.stage.toString();
        const eventPool = gameData.events.eventPools[poolId];
        if (eventPool && eventPool.length > 0) {
             // 随机选择一个未触发的事件
            let availableEvents = eventPool.filter(e => !game.uniqueEventsTriggered[e.id]);
            if (availableEvents.length > 0) {
                const randomIndex = Math.floor(Math.random() * availableEvents.length);
                currentEvent = availableEvents[randomIndex];
            } else {
                // 如果所有事件都已触发，则进入一个默认的休息事件
                currentEvent = {
                    text: "你感到有些疲惫，暂时休整了一段时间。",
                    options: [{ text: "继续旅程", type: "event", next_event_id: null }]
                };
            }
        } else {
            eventTextP.textContent = "故事已断线。请等待新的内容...";
            renderContinueButton();
            return;
        }
    }

    if (currentEvent) {
        game.lastEventId = eventId;
        if (currentEvent.id) {
            game.uniqueEventsTriggered[currentEvent.id] = true;
        }
        renderEvent(currentEvent, choicesArea, (chosenOption) => {
            handleChoice(chosenOption);
        });
    }
}

/**
 * 处理玩家选择的选项。
 * @param {object} chosenOption 玩家选择的选项数据。
 */
function handleChoice(chosenOption) {
    // 检查前置任务
    if (chosenOption.prerequisites) {
        const missingPrereqs = chosenOption.prerequisites.filter(p => !game.questProgress[p]);
        if (missingPrereqs.length > 0) {
            eventTextP.textContent = `【提示】你还未完成前置任务: ${missingPrereqs.map(p => gameData.stories[p] || p).join('、')}`;
            // 重新渲染上一个事件，或者给一个返回按钮
            const lastEvent = gameData.events[game.lastEventId];
            if (lastEvent) {
                renderEvent(lastEvent, choicesArea, handleChoice);
            } else {
                renderContinueButton();
            }
            return;
        }
    }
    
    // 应用奖励
    if (chosenOption.reward) {
        if (chosenOption.reward.items) {
            chosenOption.reward.items.forEach(item => {
                game.inventory.push(item);
            });
        }
        if (chosenOption.reward.story_key) {
            game.questProgress[chosenOption.reward.story_key] = true;
            const storyText = gameData.stories[chosenOption.reward.story_key];
            if (storyText) {
                 eventTextP.textContent += `\n\n【任务更新】${storyText}`;
            }
        }
    }
    
    // 应用效果
    if (chosenOption.effect) {
        applyEffect(chosenOption.effect);
    }
    
    // 处理不同类型的选项
    switch (chosenOption.type) {
        case 'event':
        case 'dialogue':
            eventTextP.textContent = chosenOption.dialogueText || gameData.events[chosenOption.next_event_id]?.text || chosenOption.text;
            nextEvent(chosenOption.next_event_id);
            break;
        case 'check':
            const checkResult = performCheck(chosenOption.check.attribute, chosenOption.check.value, game.player.attributes);
            if (checkResult) {
                if(chosenOption.success.item) {
                     game.inventory.push(chosenOption.success.item);
                }
                applyEffect(chosenOption.success.effect);
                eventTextP.textContent = chosenOption.success.text;
                nextEvent(chosenOption.success.eventId);
            } else {
                applyEffect(chosenOption.fail.effect);
                eventTextP.textContent = chosenOption.fail.text;
                nextEvent(chosenOption.fail.eventId);
            }
            break;
        case 'combat':
            handleCombat(chosenOption);
            break;
        case 'attribute':
            applyEffect(chosenOption.effect);
            eventTextP.textContent = chosenOption.successText;
            nextEvent();
            break;
        case 'ending':
            endGame(chosenOption.endingId);
            break;
        default:
            nextEvent();
            break;
    }

    updateUI();
}

/**
 * 处理战斗逻辑。
 * @param {object} combatOption 战斗选项。
 */
function handleCombat(combatOption) {
    const monster = gameData.monsters[combatOption.monsterId];
    if (!monster) {
        eventTextP.textContent = "未知的敌人，战斗取消。";
        nextEvent();
        return;
    }

    eventTextP.textContent = `你遭遇了 ${monster.name}！\n`;

    let playerDamage = calculateCombatDamage(game.player, monster);
    let monsterDamage = calculateCombatDamage(monster, game.player);

    eventTextP.textContent += `你对 ${monster.name} 造成了 ${playerDamage} 点伤害。\n`;
    eventTextP.textContent += `${monster.name} 对你造成了 ${monsterDamage} 点伤害。\n`;

    game.player.currentHP -= monsterDamage;
    monster.hp -= playerDamage;

    if (game.player.currentHP <= 0) {
        game.gameOver = true;
        eventTextP.textContent += "你被击败了！游戏结束。";
        endGame('be_forgotten');
        return;
    }

    if (monster.hp <= 0) {
        eventTextP.textContent += `你击败了 ${monster.name}！你获得了 ${monster.exp} 点经验值。`;
        game.player.exp += monster.exp;
        checkLevelUp();
        if (monster.drops) {
             monster.drops.forEach(item => {
                 game.inventory.push(item);
                 eventTextP.textContent += `\n你获得了 ${gameData.items[item].name}。`;
             });
        }
        nextEvent(combatOption.success.eventId);
    } else {
        eventTextP.textContent += `战斗仍在继续！`;
        renderEvent({ text: "你再次面对敌人。", options: [{ text: "继续战斗", type: "combat", monsterId: combatOption.monsterId, success: combatOption.success }] }, choicesArea, (chosenOption) => {
            handleChoice(chosenOption);
        });
    }

    updateUI();
}


/**
 * 检查玩家是否升级。
 */
function checkLevelUp() {
    if (game.player.exp >= game.player.nextLevelExp) {
        game.player.level++;
        game.player.exp = 0;
        game.player.nextLevelExp = Math.floor(game.player.nextLevelExp * 1.5);
        eventTextP.textContent += `\n【升级】你升到了 ${game.player.level} 级！`;
    }
}

/**
 * 应用事件效果（属性或物品）。
 * @param {object} effect 效果对象。
 */
function applyEffect(effect) {
    if (!effect) return;

    for (const attr in effect) {
        if (game.player.attributes[attr] !== undefined) {
            game.player.attributes[attr] += effect[attr];
        }
    }
    // 特殊效果处理，例如抗性
    if (effect.hp) {
        game.player.currentHP += effect.hp;
        game.player.currentHP = Math.min(game.player.currentHP, game.player.maxHP);
    }
}

/**
 * 结束游戏，并展示结局。
 * @param {string} endingId 结局ID。
 */
function endGame(endingId) {
    game.gameOver = true;
    const ending = gameData.stories.endings[endingId];
    if (ending) {
        switchScreen('ending-screen');
        document.getElementById('ending-title').textContent = ending.title;
        document.getElementById('ending-text').textContent = ending.description;
    } else {
        console.error("未找到结局:", endingId);
        switchScreen('ending-screen');
        document.getElementById('ending-title').textContent = "一个未知的结局";
        document.getElementById('ending-text').textContent = "你的旅程以一个未知的方式结束了。";
    }
}


// 事件监听器
newGameBtn.addEventListener('click', () => {
    switchScreen('attribute-screen');
    renderAttributeScreen();
});

loadGameBtn.addEventListener('click', () => {
    const savedData = loadGameData();
    if (savedData) {
        game = savedData;
        switchScreen('game-screen');
        updateUI();
        setChapterTitle(game.stage);
        eventTextP.textContent = "游戏已载入，你回到了你的旅程中。";
    }
});

confirmAttributesBtn.addEventListener('click', () => {
    if (game.player.pointsLeft === 0) {
        switchScreen('game-screen');
        startGame();
    }
});

saveGameBtn.addEventListener('click', () => {
    saveGameData(game);
    alert('游戏已保存！');
});

returnToMenuBtn.addEventListener('click', () => {
    if (confirm('确定要返回主菜单吗？你的进度将会丢失，除非你已保存。')) {
        initGame();
    }
});

toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('hidden');
});

document.getElementById('restart-game-btn').addEventListener('click', () => {
    initGame();
});

// 游戏初始化
document.addEventListener('DOMContentLoaded', initGame);