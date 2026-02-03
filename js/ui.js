export class UIManager {
    constructor(player) {
        this.player = player;
        this.inventoryScreen = document.getElementById('inventory-screen');
        this.invGrid = document.getElementById('inventory-grid');
        this.craftingList = document.getElementById('crafting-list');
        this.hotbarSlots = Array.from(document.querySelectorAll('.hotbar .slot'));
        this.isOpen = false;

        // Recipes
        this.recipes = [
            { name: 'Wood Wall', cost: { wood: 50 }, type: 'structure', itemId: 'wall_wood' },
            { name: 'Stone Wall', cost: { stone: 50, wood: 10 }, type: 'structure', itemId: 'wall_stone' },
            { name: 'Door', cost: { wood: 30 }, type: 'structure', itemId: 'door_wood' }
        ];

        this.init();
    }

    init() {
        this.renderCrafting();
        this.updateHotbar();
    }

    selectSlot(index) {
        if (index < 0 || index > 5) return;
        this.player.activeSlot = index;
        this.updateHotbar();
    }

    updateHotbar() {
        this.hotbarSlots.forEach((slot, i) => {
            if (i === this.player.activeSlot) slot.classList.add('active');
            else slot.classList.remove('active');

            let item = this.player.hotbar[i];
            if (item) {
                slot.innerText = item.name.substring(0, 4); // Abbrev
            } else {
                slot.innerText = i + 1;
            }
        });
    }

    toggleInventory() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.inventoryScreen.classList.remove('hidden');
            this.updateInventory();
        } else {
            this.inventoryScreen.classList.add('hidden');
        }
    }

    updateInventory() {
        if (!this.isOpen) return;

        this.invGrid.innerHTML = '';
        // Render Inventory Items (Bag)
        for (let [itemKey, count] of Object.entries(this.player.inventory)) {
            if (count > 0) {
                let div = document.createElement('div');
                div.className = 'slot';
                div.innerText = `${itemKey}\nx${count}`;
                div.style.fontSize = '10px';
                this.invGrid.appendChild(div);
            }
        }
    }

    renderCrafting() {
        this.craftingList.innerHTML = '';
        this.recipes.forEach(recipe => {
            let div = document.createElement('div');
            div.className = 'craft-item';
            div.innerHTML = `<strong>${recipe.name}</strong><br><small>${this.formatCost(recipe.cost)}</small>`;
            div.onclick = () => this.craft(recipe);
            this.craftingList.appendChild(div);
        });
    }

    formatCost(cost) {
        return Object.entries(cost).map(([k, v]) => `${k}:${v}`).join(', ');
    }

    craft(recipe) {
        // Check cost
        let canCraft = true;
        for (let [res, amt] of Object.entries(recipe.cost)) {
            if ((this.player.inventory[res] || 0) < amt) {
                canCraft = false;
            }
        }

        if (canCraft) {
            // Deduct
            for (let [res, amt] of Object.entries(recipe.cost)) {
                this.player.inventory[res] -= amt;
            }

            // Add to Hotbar (Next empty slot)
            let added = false;
            for (let i = 0; i < 6; i++) {
                if (this.player.hotbar[i] === null) {
                    this.player.hotbar[i] = { name: recipe.name, id: recipe.itemId };
                    added = true;
                    break;
                }
            }

            if (!added) {
                alert("Hotbar full! (Inventory item support coming soon)");
                // Refund? or drop? For now just warning.
            }

            this.updateInventory(); // Update counts
            this.updateHotbar();
        } else {
            alert('Not enough resources!');
        }
    }
}
