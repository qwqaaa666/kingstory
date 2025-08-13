// src/components/EventDisplay.js

/**
 * 清空选项按钮。
 * @param {HTMLElement} choicesAreaElement 选项按钮的父元素。
 */
export function clearChoices(choicesAreaElement) {
    choicesAreaElement.innerHTML = '';
}

/**
 * 渲染事件文本和选项。
 * @param {object} eventData 事件数据对象。
 * @param {HTMLElement} choicesAreaElement 选项按钮的父元素。
 * @param {Function} onChoiceMade 玩家做出选择后的回调函数。
 */
export function renderEvent(eventData, choicesAreaElement, onChoiceMade) {
    const eventTextP = document.querySelector('.event-text');
    eventTextP.textContent = eventData.text;

    clearChoices(choicesAreaElement);

    if (eventData.options && eventData.options.length > 0) {
        eventData.options.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option.text;
            button.addEventListener('click', () => {
                onChoiceMade(option);
            });
            choicesAreaElement.appendChild(button);
        });
    }
}