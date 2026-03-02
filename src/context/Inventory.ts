export interface CargoItem {
  name: string;
  quantity: number;
}

export let cargo: CargoItem[] = [];

export function setCargo(items: CargoItem[]) {
  cargo = [...items];
}

export function clearCargo() {
  cargo = [];
}

export function reduceCargoItem(name: string, amount: number) {
  cargo = cargo
    .map(item => item.name === name ? { ...item, quantity: item.quantity - amount } : item)
    .filter(item => item.quantity > 0);
}
