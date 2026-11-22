// Carta de La Central Café (misma estructura que el menú en Illustrator). Precios en COP.
// model: archivo en models/ (modelos DE PRUEBA: se reemplazan por los reales con el mismo nombre)
export const COMBO = ['+papa criolla', '+coca zero 250ml'];

export const MENU = [
  {
    id: 'cafe-de-dia', titulo: 'café de día',
    bloques: [
      {
        tipo: 'lista', id: 'cafes', subtitulo: 'Café', horario: 'dia',
        items: [
          { id: 'cafe', nombre: 'Café', precio: 0, desc: 'Café de origen.' },
        ],
      },
      {
        tipo: 'lista', id: 'horneados', subtitulo: 'Horneados', horario: 'dia',
        items: [
          { id: 'empanadas-horneadas', nombre: 'Empanadas horneadas', precio: 0 },
          { id: 'pastel-pollo', nombre: 'Pastel de pollo', precio: 0 },
          { id: 'pastel-hawaiano', nombre: 'Pastel hawaiano', precio: 0 },
          { id: 'torta-vino', nombre: 'Torta de vino', precio: 0 },
          { id: 'mantecada', nombre: 'Mantecada', precio: 0 },
        ],
      },
    ],
  },
  {
    id: 'choripan', titulo: 'choripan',
    bloques: [
      {
        tipo: 'destacado', horario: 'noche',
        items: [
          {
            id: 'choripan', nombre: 'Choripan', precio: 13000, combo: 17000, model: 'choripan',
            desc: 'Pan baguette de ajo, chorizo artesanal asado a la parrilla, chimichurri de la casa y ese sabor ahumado que nos representa.',
          },
          {
            id: 'chori-doble', nombre: 'Chori-doble', precio: 20000, combo: 24000, model: 'chori-doble',
            desc: 'Pan baguette de ajo, doble chorizo artesanal asado a la parrilla, chimichurri de la casa y ese sabor ahumado que nos representa.',
          },
        ],
      },
      {
        tipo: 'lista', id: 'adiciones', subtitulo: 'Adiciones', horario: 'noche',
        items: [
          { id: 'aguacate', nombre: 'Aguacate', precio: 2000, model: 'aguacate' },
          { id: 'queso', nombre: 'Queso', precio: 2000, model: 'queso' },
        ],
      },
    ],
  },
  {
    id: 'fuego-de-noche', titulo: 'fuego de noche',
    bloques: [
      {
        tipo: 'lista', id: 'parrilla', subtitulo: 'De la parrilla', horario: 'noche',
        items: [
          { id: 'alitas', nombre: 'Alitas', precio: 0, desc: 'Lulo, maracuyá o BBQ.' },
          { id: 'costillas-bbq', nombre: 'Costillas BBQ', precio: 0 },
          { id: 'sandwich', nombre: 'Sándwich', precio: 0 },
          { id: 'nachos', nombre: 'Nachos', precio: 0 },
        ],
      },
    ],
  },
  {
    id: 'bebidas', titulo: 'bebidas',
    bloques: [
      {
        tipo: 'lista', id: 'cervezas', subtitulo: 'Cervezas', horario: 'siempre',
        items: [
          { id: 'stella', nombre: 'Stella Artois', precio: 6000, model: 'stella' },
          { id: 'solecita', nombre: 'Solecita', precio: 4500, model: 'solecita' },
          { id: 'coronita', nombre: 'Coronita', precio: 4500, model: 'coronita' },
          { id: 'aguila', nombre: 'Aguila', precio: 3500, model: 'aguila' },
          { id: 'poker', nombre: 'Poker', precio: 3500, model: 'poker' },
        ],
      },
      {
        tipo: 'lista', id: 'sin-alcohol', subtitulo: 'Sin alcohol', horario: 'siempre',
        items: [
          { id: 'coca-250', nombre: 'Coca-Cola 250ml', precio: 2500, model: 'coca-250' },
          { id: 'coca-400', nombre: 'Coca-Cola 400ml', precio: 4000, model: 'coca-400' },
          { id: 'soda-hatsu', nombre: 'Soda HATSU', precio: 4500, model: 'soda-hatsu' },
          { id: 'te-hatsu', nombre: 'Te HATSU', precio: 7000, model: 'te-hatsu' },
          { id: 'agua', nombre: 'Agua 600ml', precio: 3000, model: 'agua' },
        ],
      },
    ],
  },
];
