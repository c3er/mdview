exports.getChecked = (menu, id) => menu.getMenuItemById(id).checked

exports.setChecked = (menu, id, isChecked) => (menu.getMenuItemById(id).checked = isChecked)

exports.setEnabled = (menu, id, isEnabled) => (menu.getMenuItemById(id).enabled = isEnabled)
