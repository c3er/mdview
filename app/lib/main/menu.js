exports.getItemState = (menu, id) => menu.getMenuItemById(id).checked

exports.setItemState = (menu, id, isChecked) => (menu.getMenuItemById(id).checked = isChecked)
