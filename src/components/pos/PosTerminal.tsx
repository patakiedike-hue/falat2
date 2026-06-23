import { useState, useEffect, useRef } from 'react';
import type { Product, Category, CartItem, Cart, OrderType } from '../../types';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { Button, Card, Input, Badge, QuantitySelector, Modal, EmptyState } from '../common/Modal';
import { Search, Plus, Minus, Trash2, ShoppingBag, Truck, Store, Clock, User, MapPin, Phone, Mail, FileText, CreditCard, Banknote, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PosTerminalProps {
  onOrderCreated?: (orderId: string) => void;
  selectedTableId?: string | null;
}

export function PosTerminal({ onOrderCreated, selectedTableId }: PosTerminalProps) {
  const { tenant } = useTenant();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [cart, setCart] = useState<Cart>({
    items: [],
    orderType: 'delivery',
    tableId: selectedTableId || null,
    promotionCode: null,
    customer: {
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      postalCode: '',
      notes: '',
    },
  });

  const [showCheckout, setShowCheckout] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadMenu();
  }, [tenant]);

  useEffect(() => {
    if (selectedTableId) {
      setCart((prev) => ({ ...prev, orderType: 'dine_in', tableId: selectedTableId }));
    }
  }, [selectedTableId]);

  const loadMenu = async () => {
    if (!tenant) return;

    try {
      const [catRes, prodRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('products')
          .select('*, category:categories(*)')
          .eq('tenant_id', tenant.id)
          .eq('is_available', true)
          .order('display_order'),
      ]);

      if (catRes.data) setCategories(catRes.data as Category[]);
      if (prodRes.data) setProducts(prodRes.data as Product[]);
    } catch (error) {
      console.error('Failed to load menu:', error);
      toast.error('Nem sikerült betölteni a menüt');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    const matchesSearch = !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existingIndex = prev.items.findIndex(
        (item) => item.product.id === product.id && !item.variant && !item.notes
      );

      if (existingIndex >= 0) {
        const items = [...prev.items];
        items[existingIndex].quantity += 1;
        return { ...prev, items };
      }

      return {
        ...prev,
        items: [...prev.items, { product, quantity: 1, variant: null, notes: '' }],
      };
    });

    toast.success(`${product.name} hozzáadva`);
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(index);
      return;
    }

    setCart((prev) => {
      const items = [...prev.items];
      if (quantity > 0) {
        items[index].quantity = quantity;
      }
      return { ...prev, items };
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const clearCart = () => {
    setCart({
      items: [],
      orderType: cart.orderType,
      tableId: cart.tableId,
      promotionCode: null,
      customer: { name: '', phone: '', email: '', address: '', city: '', postalCode: '', notes: '' },
    });
  };

  const calculateTotals = () => {
    const subtotal = cart.items.reduce((sum, item) => {
      const price = item.product.price + (item.variant?.price_adjustment || 0);
      return sum + price * item.quantity;
    }, 0);

    const deliveryFee = cart.orderType === 'delivery' ? (tenant?.delivery_fee || 0) : 0;
    const discount = 0;
    const tax = subtotal * 0.05;
    const total = subtotal + deliveryFee + tax - discount;

    return { subtotal, deliveryFee, discount, tax, total };
  };

  const handleCheckout = async (paymentMethod: 'cash' | 'card' | 'online') => {
    if (cart.items.length === 0) {
      toast.error('A kosár üres');
      return;
    }

    if (!tenant) {
      toast.error('Nincs aktív étterem');
      return;
    }

    setIsSubmitting(true);

    try {
      const totals = calculateTotals();

      const orderData = {
        tenant_id: tenant.id,
        table_id: cart.orderType === 'dine_in' ? cart.tableId : null,
        customer_name: cart.customer.name || null,
        customer_phone: cart.customer.phone || null,
        customer_email: cart.customer.email || null,
        delivery_address: cart.orderType === 'delivery' ? cart.customer.address : null,
        delivery_city: cart.orderType === 'delivery' ? cart.customer.city : null,
        delivery_postal_code: cart.orderType === 'delivery' ? cart.customer.postalCode : null,
        delivery_notes: cart.customer.notes || null,
        order_type: cart.orderType,
        status: 'pending' as const,
        payment_status: 'pending' as const,
        payment_method: paymentMethod,
        subtotal: totals.subtotal,
        delivery_fee: totals.deliveryFee,
        discount: totals.discount,
        tax: totals.tax,
        total: totals.total,
        source: 'pos',
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError || !order) {
        throw orderError || new Error('Nem sikerült létrehozni a rendelést');
      }

      const orderItems = cart.items.map((item) => ({
        tenant_id: tenant.id,
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_price: item.product.price,
        quantity: item.quantity,
        variant_id: item.variant?.id || null,
        variant_name: item.variant?.name || null,
        variant_price_adjustment: item.variant?.price_adjustment || 0,
        notes: item.notes || null,
        subtotal: (item.product.price + (item.variant?.price_adjustment || 0)) * item.quantity,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

      if (itemsError) {
        throw itemsError;
      }

      if (cart.orderType === 'dine_in' && cart.tableId) {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'occupied' })
          .eq('id', cart.tableId);
      }

      toast.success(`Rendelés #${order.order_number} létrehozva`);
      clearCart();
      setShowCheckout(false);
      onOrderCreated?.(order.id);
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Nem sikerült létrehozni a rendelést');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = calculateTotals();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] gap-4">
      {/* Products Panel */}
      <div className="flex-1 flex flex-col">
        {/* Search & Categories */}
        <div className="mb-4 space-y-3">
          <Input
            placeholder="Keresés..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={18} />}
          />

          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === null ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              Összes
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-auto">
          {filteredProducts.length === 0 ? (
            <EmptyState
              title="Nincs találat"
              description="Próbálj más kategóriát vagy keresőszót"
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:shadow-md hover:border-[var(--color-primary)] transition-all"
                  padding="sm"
                  onClick={() => addToCart(product)}
                >
                  <div className="aspect-square rounded-lg bg-gray-100 mb-2 overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ShoppingBag size={48} />
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium text-sm text-gray-900 truncate">{product.name}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[var(--color-primary)] font-semibold">
                      {product.price.toLocaleString('hu-HU')} Ft
                    </p>
                    {product.preparation_time_minutes && (
                      <div className="flex items-center text-xs text-gray-500 gap-1">
                        <Clock size={12} />
                        {product.preparation_time_minutes}p
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-96 bg-white rounded-xl shadow-sm border flex flex-col">
        {/* Cart Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Kosár</h2>
            {cart.items.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                <Trash2 size={16} className="mr-1" />
                Ürítés
              </Button>
            )}
          </div>

          {/* Order Type */}
          <div className="flex gap-2">
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-colors ${
                cart.orderType === 'delivery'
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setCart((prev) => ({ ...prev, orderType: 'delivery', tableId: null }))}
            >
              <Truck size={18} />
              <span className="text-sm font-medium">Szállítás</span>
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-colors ${
                cart.orderType === 'pickup'
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setCart((prev) => ({ ...prev, orderType: 'pickup', tableId: null }))}
            >
              <Store size={18} />
              <span className="text-sm font-medium">Elvitel</span>
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-colors ${
                cart.orderType === 'dine_in'
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setCart((prev) => ({ ...prev, orderType: 'dine_in' }))}
              disabled={!selectedTableId && cart.tableId === null}
            >
              <User size={18} />
              <span className="text-sm font-medium">Helyben</span>
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto p-4">
          {cart.items.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag size={48} />}
              title="Üres kosár"
              description="Válassz termékeket a menüből"
            />
          ) : (
            <div className="space-y-3">
              {cart.items.map((item, index) => (
                <div
                  key={`${item.product.id}-${index}`}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{item.product.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.product.price.toLocaleString('hu-HU')} Ft
                    </p>
                    {item.notes && (
                      <p className="text-xs text-gray-400 italic mt-1">{item.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <QuantitySelector
                      value={item.quantity}
                      onChange={(qty) => updateQuantity(index, qty)}
                      size="sm"
                    />
                    <button
                      onClick={() => removeFromCart(index)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        <div className="p-4 border-t bg-gray-50 rounded-b-xl">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Részösszeg</span>
              <span>{totals.subtotal.toLocaleString('hu-HU')} Ft</span>
            </div>
            {cart.orderType === 'delivery' && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Szállítási díj</span>
                <span>{totals.deliveryFee.toLocaleString('hu-HU')} Ft</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg border-t pt-2">
              <span>Összesen</span>
              <span className="text-[var(--color-primary)]">
                {Math.round(totals.total).toLocaleString('hu-HU')} Ft
              </span>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={cart.items.length === 0}
            onClick={() => setShowCheckout(true)}
          >
            Tovább a fizetéshez
          </Button>
        </div>
      </div>

      {/* Checkout Modal */}
      <Modal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        title="Fizetés"
        size="lg"
      >
        <div className="space-y-6">
          {/* Customer Info */}
          {cart.orderType === 'delivery' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Vevő adatai</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Név"
                  value={cart.customer.name}
                  onChange={(e) =>
                    setCart((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, name: e.target.value },
                    }))
                  }
                  leftIcon={<User size={16} />}
                />
                <Input
                  label="Telefonszám"
                  value={cart.customer.phone}
                  onChange={(e) =>
                    setCart((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, phone: e.target.value },
                    }))
                  }
                  leftIcon={<Phone size={16} />}
                />
                <Input
                  label="Email"
                  type="email"
                  value={cart.customer.email}
                  onChange={(e) =>
                    setCart((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, email: e.target.value },
                    }))
                  }
                  leftIcon={<Mail size={16} />}
                />
                <Input
                  label="Irányítószám"
                  value={cart.customer.postalCode}
                  onChange={(e) =>
                    setCart((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, postalCode: e.target.value },
                    }))
                  }
                />
                <Input
                  label="Város"
                  value={cart.customer.city}
                  onChange={(e) =>
                    setCart((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, city: e.target.value },
                    }))
                  }
                />
                <Input
                  label="Cím"
                  value={cart.customer.address}
                  onChange={(e) =>
                    setCart((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, address: e.target.value },
                    }))
                  }
                  leftIcon={<MapPin size={16} />}
                  className="col-span-2"
                />
              </div>
              <Input
                label="Megjegyzés"
                value={cart.customer.notes}
                onChange={(e) =>
                  setCart((prev) => ({
                    ...prev,
                    customer: { ...prev.customer, notes: e.target.value },
                  }))
                }
                leftIcon={<FileText size={16} />}
              />
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Fizetési mód</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 hover:border-[var(--color-primary)] transition-colors"
                onClick={() => handleCheckout('cash')}
                disabled={isSubmitting}
              >
                <Banknote size={32} className="text-green-600" />
                <span className="font-medium">Készpénz</span>
              </button>
              <button
                className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 hover:border-[var(--color-primary)] transition-colors"
                onClick={() => handleCheckout('card')}
                disabled={isSubmitting}
              >
                <CreditCard size={32} className="text-blue-600" />
                <span className="font-medium">Bankkártya</span>
              </button>
              <button
                className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 hover:border-[var(--color-primary)] transition-colors"
                onClick={() => handleCheckout('online')}
                disabled={isSubmitting}
              >
                <CheckCircle size={32} className="text-purple-600" />
                <span className="font-medium">Online</span>
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Részösszeg</span>
              <span>{totals.subtotal.toLocaleString('hu-HU')} Ft</span>
            </div>
            {cart.orderType === 'delivery' && (
              <div className="flex justify-between">
                <span>Szállítási díj</span>
                <span>{totals.deliveryFee.toLocaleString('hu-HU')} Ft</span>
            </div>
            )}
            <div className="flex justify-between font-semibold text-lg border-t pt-2">
              <span>Összesen</span>
              <span>{Math.round(totals.total).toLocaleString('hu-HU')} Ft</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
