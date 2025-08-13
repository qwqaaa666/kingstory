// src/components/CharacterSheet.js

/**
 * 渲染或更新角色信息面板。
 * @param {object} player 玩家角色数据。
 * @param {string} job 玩家职业。
 * @param {number} stage 当前游戏阶段。
 * @param {number} stamina 当前体力值。
 * @param {number} maxStamina 最大体力值。
 * @param {object} questProgress 任务进度对象。
 */
export function renderCharacterSheet(player, job, stage, stamina, maxStamina, questProgress) {
    const sheetContent = document.getElementById('character-sheet-content');
    if (!sheetContent) return;

    const attributesHtml = Object.keys(player.attributes).map(attr =>
        `<p>${attr}: <span>${player.attributes[attr]}</span></p>`
    ).join('');

    const questListHtml = Object.keys(questProgress).filter(key => key.includes('quest')).map(key =>
        `<li class="completed-quest">${questProgress[key]}</li>`
    ).join('');

    sheetContent.innerHTML = `
        <h3>角色信息</h3>
        <p>等级: <span>${player.level}</span></p>
        <p>经验: <span>${player.exp} / ${player.nextLevelExp}</span></p>
        <p>生命值: <span>${player.currentHP} / ${player.maxHP}</span></p>
        <p>体力: <span>${stamina} / ${maxStamina}</span></p>
        <p>职业: <span>${job || '无'}</span></p>
        <h4>属性</h4>
        ${attributesHtml}
        <h4>任务日志</h4>
        <ul id="completed-quest-list">${questListHtml || '无'}</ul>
    `;
}