import type { Order } from '../types';

export interface PrintConfig {
  kitchen?: {
    enabled: boolean;
    printer?: string;
    autoPrint: boolean;
  };
  receipt?: {
    enabled: boolean;
    printer?: string;
    autoPrint: boolean;
  };
  courier?: {
    enabled: boolean;
    printer?: string;
  };
}

export function generateKitchenTicket(order: Order): string {
  let content = `
╔════════════════════════════════╗
║      KONYHA BLOKK              ║
╠════════════════════════════════╣
║ Rendelés: #${order.order_number.padEnd(18)}║
║ Idő: ${new Date(order.created_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }).padEnd(25)}║
╠════════════════════════════════╣
`;

  order.items?.forEach((item) => {
    content += `║ ${item.quantity}x ${item.product_name.padEnd(24)}║`;
    if (item.variant_name) {
      content += `║    (${item.variant_name})`.padEnd(32) + '║';
    }
    if (item.notes) {
      content += `║    ${item.notes.substring(0, 26).padEnd(26)}║`;
    }
  });

  content += `╠════════════════════════════════╣
║ ${order.order_type === 'delivery' ? 'SZÁLLÍTÁS' : order.order_type === 'pickup' ? 'ELVITEL' : 'HELYBEN'.padEnd(27)}║`;

  if (order.customer_name) {
    content += `║ Név: ${order.customer_name.substring(0, 25).padEnd(25)}║`;
  }

  if (order.order_type === 'delivery' && order.delivery_address) {
    content += `║ Cím: ${order.delivery_address.substring(0, 25).padEnd(25)}║`;
    if (order.customer_phone) {
      content += `║ Tel: ${order.customer_phone.padEnd(26)}║`;
    }
  }

  if (order.notes) {
    content += `╠════════════════════════════════╣
║ Megjegyzés:                   ║
║ ${order.notes.substring(0, 29).padEnd(29)}║`;
  }

  content += `
╚════════════════════════════════╝
`;

  return content;
}

export function generateCourierTicket(order: Order): string {
  let content = `
╔════════════════════════════════╗
║      FUTÁR BLOKK              ║
╠════════════════════════════════╣
║ Rendelés: #${order.order_number.padEnd(18)}║
╠════════════════════════════════╣
║ VEVŐ ADATAI:                  ║
`;

  if (order.customer_name) {
    content += `║ Név: ${order.customer_name.substring(0, 25).padEnd(25)}║`;
  }

  if (order.customer_phone) {
    content += `║ Tel: ${order.customer_phone.padEnd(26)}║`;
  }

  if (order.delivery_address) {
    content += `╠════════════════════════════════╣
║ CÍM:                         ║
║ ${order.delivery_address.substring(0, 30).padEnd(30)}║`;
    if (order.delivery_city) {
      content += `║ ${order.delivery_postal_code || ''} ${order.delivery_city}`.padEnd(32) + '║';
    }
  }

  content += `╠════════════════════════════════╣
║ TARTALOM:                     ║`;

  order.items?.forEach((item) => {
    content += `║ ${item.quantity}x ${item.product_name.substring(0, 24).padEnd(24)}║`;
  });

  content += `╠════════════════════════════════╣
║ ÖSSZESEN: ${order.total.toLocaleString('hu-HU').padEnd(19)}Ft║`;

  if (order.payment_method === 'cash') {
    content += `║ Fizetés: KÉSZPÉNZ             ║`;
  } else {
    content += `║ Fizetés: RENDEZVE             ║`;
  }

  if (order.notes) {
    content += `╠════════════════════════════════╣
║ ${order.notes.substring(0, 29).padEnd(29)}║`;
  }

  content += `
╚════════════════════════════════╝
`;

  return content;
}

export function generateDailyReport(
  tenantName: string,
  date: Date,
  data: {
    totalOrders: number;
    totalRevenue: number;
    byType: Record<string, { count: number; revenue: number }>;
    byPayment: Record<string, number>;
  }
): string {
  const dateStr = date.toLocaleDateString('hu-HU');
  let content = `
╔════════════════════════════════╗
║       NAPI ZÁRÁS              ║
╠════════════════════════════════╣
║ ${tenantName.substring(0, 30).padEnd(30)}║
║ ${dateStr.padEnd(30)}║
╠════════════════════════════════╣
║ ÖSSZESÍTÉS:                   ║
║ Rendelések: ${data.totalOrders.toString().padEnd(18)}db║
║ Bevétel: ${data.totalRevenue.toLocaleString('hu-HU').padEnd(20)}Ft║
╠════════════════════════════════╣
║ RENDELÉS TÍPUS:               ║`;

  Object.entries(data.byType).forEach(([type, info]) => {
    const labels: Record<string, string> = {
      delivery: 'Szállítás',
      pickup: 'Elvitel',
      dine_in: 'Helyben',
    };
    content += `║ ${labels[type] || type.padEnd(11)} ${info.count.toString().padEnd(5)} ${info.revenue.toLocaleString('hu-HU').padEnd(10)}Ft║`;
  });

  content += `╠════════════════════════════════╣
║ FIZETÉSI MÓD:                 ║`;

  Object.entries(data.byPayment).forEach(([method, amount]) => {
    const labels: Record<string, string> = {
      cash: 'Készpénz',
      card: 'Bankkártya',
      online: 'Online',
    };
    content += `║ ${labels[method] || method.padEnd(14)} ${amount.toLocaleString('hu-HU').padEnd(9)}Ft║`;
  });

  content += `
╚════════════════════════════════╝
`;

  return content;
}

export function printDirect(content: string, printerName?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (!printWindow) {
        reject(new Error('Nem sikerült megnyitni a nyomtatási ablakot'));
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Nyomtatás</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              padding: 10mm;
              margin: 0;
              white-space: pre-wrap;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>${content}</body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        resolve();
      }, 250);
    } catch (error) {
      reject(error);
    }
  });
}
