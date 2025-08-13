// src/utils/storage.js

const SAVE_KEY = 'ForgottenThroneSave';

/**
 * 将游戏数据保存到本地存储。
 * @param {object} data 要保存的游戏数据。
 */
export function saveGameData(data) {
    try {
        const serializedData = JSON.stringify(data);
        localStorage.setItem(SAVE_KEY, serializedData);
    } catch (e) {
        console.error("保存游戏数据失败", e);
    }
}

/**
 * 从本地存储加载游戏数据。
 * @returns {object|null} 加载的游戏数据，如果没有找到则返回null。
 */
export function loadGameData() {
    try {
        const serializedData = localStorage.getItem(SAVE_KEY);
        if (serializedData === null) {
            return null;
        }
        return JSON.parse(serializedData);
    } catch (e) {
        console.error("加载游戏数据失败", e);
        return null;
    }
}

/**
 * 清除本地存储的游戏数据。
 */
export function clearGameData() {
    localStorage.removeItem(SAVE_KEY);
}