import { useState, useEffect } from 'react';
import type { InventoryItem, Product, RecipeIngredient } from '../../types';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { Button, Card, Modal, Input, Select, Badge, Table, EmptyState } from '../common/Modal';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Edit2,
  Trash2,
  History,
  TrendingDown,
  ShoppingCart,
  ChefHat,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type InventoryView = 'items' | 'recipes' | 'alerts' | 'transactions';

export function InventoryManagement() {
  const { tenant } = useTenant();
  const [activeView, setActiveView] = useState<InventoryView>('items');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (tenant) {
      loadData();
    }
  }, [tenant]);

  const loadData = async () => {
    if (!tenant) return;

    try {
      const [itemsRes, productsRes, lowStockRes] = await Promise.all([
        supabase
          .from('inventory_items')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('products')
          .select('*, recipe:recipe_ingredients(*, inventory_item:inventory_items(*))')
          .eq('tenant_id', tenant.id)
          .order('name'),
        supabase.rpc('get_low_stock_alerts', { p_tenant_id: tenant.id }),
      ]);

      if (itemsRes.data) setItems(itemsRes.data as InventoryItem[]);
      if (productsRes.data) setProducts(productsRes.data as Product[]);
      if (lowStockRes.data) setLowStockItems(lowStockRes.data);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast.error('Nem sikerült betölteni a készletet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateItem = async (itemData: Partial<InventoryItem>) => {
    if (!tenant) return;

    try {
      const { error } = await supabase.from('inventory_items').insert({
        tenant_id: tenant.id,
        name: itemData.name || '',
        sku: itemData.sku || null,
        unit: itemData.unit || 'db',
        current_stock: itemData.current_stock || 0,
        min_stock: itemData.min_stock || 10,
        unit_cost: itemData.unit_cost || 0,
        supplier: itemData.supplier || null,
      });

      if (error) throw error;
      toast.success('Alapanyag létrehozva');
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to create item:', error);
      toast.error('Nem sikerült létrehozni');
    }
  };

  const handleUpdateItem = async (itemData: Partial<InventoryItem>) => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          name: itemData.name,
          sku: itemData.sku,
          unit: itemData.unit,
          min_stock: itemData.min_stock,
          unit_cost: itemData.unit_cost,
          supplier: itemData.supplier,
        })
        .eq('id', editingItem.id);

      if (error) throw error;
      toast.success('Frissítve');
      setEditingItem(null);
      loadData();
    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error('Nem sikerült frissíteni');
    }
  };

  const restockItem = async (itemId: string, quantity: number, cost: number) => {
    try {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const newStock = item.current_stock + quantity;

      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          current_stock: newStock,
          last_restocked_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      const { error: transactionError } = await supabase.from('inventory_transactions').insert({
        tenant_id: tenant?.id,
        inventory_item_id: itemId,
        transaction_type: 'restock',
        quantity: quantity,
        previous_stock: item.current_stock,
        new_stock: newStock,
        notes: `Beszerzés - ${cost.toLocaleString('hu-HU')} Ft`,
      });

      if (transactionError) throw transactionError;

      toast.success(`Beszerzés rögzítve: +${quantity} ${item.unit}`);
      loadData();
    } catch (error) {
      console.error('Failed to restock:', error);
      toast.error('Nem sikerült rögzíteni');
    }
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.sku?.toLowerCase().includes(query) ||
      item.supplier?.toLowerCase().includes(query)
    );
  });

  const UNIT_LABELS: Record<string, string> = {
    db: 'darab',
    kg: 'kilogramm',
    g: 'gramm',
    l: 'liter',
    ml: 'milliliter',
    csomag: 'csomag',
    adag: 'adag',
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Készletgazdálkodás</h2>
          <p className="text-gray-500 mt-1">Kezelje az alapanyagokat és recepteket</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={18} className="mr-2" />
          Új alapanyag
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { id: 'items', label: 'Alapanyagok', icon: Package },
          { id: 'recipes', label: 'Receptek', icon: ChefHat },
          { id: 'alerts', label: 'Riasztások', icon: AlertTriangle, count: lowStockItems.length },
          { id: 'transactions', label: 'Tranzakciók', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as InventoryView)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeView === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <Badge variant="error" size="sm">
                  {tab.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeView === 'items' && (
        <div className="space-y-4">
          {/* Search */}
          <Input
            placeholder="Keresés..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={18} />}
          />

          {/* Items Grid */}
          {filteredItems.length === 0 ? (
            <EmptyState
              icon={<Package size={48} />}
              title="Nincsenek alapanyagok"
              description="Adjon hozzá alapanyagokat a készletkövetéshez"
              action={
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus size={18} className="mr-2" />
                  Új alapanyag
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const isLow = item.current_stock <= item.min_stock;
                const stockPercent = Math.min(
                  100,
                  Math.max(0, (item.current_stock / (item.min_stock * 3)) * 100)
                );

                return (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          {item.sku && (
                            <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                          )}
                        </div>
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-1.5 hover:bg-gray-100 rounded"
                        >
                          <Edit2 size={16} className="text-gray-500" />
                        </button>
                      </div>

                      {/* Stock Level */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Készlet</span>
                          <span className={isLow ? 'text-red-600 font-medium' : ''}>
                            {item.current_stock} / {item.min_stock} {UNIT_LABELS[item.unit]}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              isLow ? 'bg-red-500' : stockPercent > 75 ? 'bg-green-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${stockPercent}%` }}
                          />
                        </div>
                      </div>

                      {isLow && (
                        <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded text-sm">
                          <AlertTriangle size={16} />
                          <span>Alacsony készlet!</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Ár: {item.unit_cost.toLocaleString('hu-HU')} Ft/{UNIT_LABELS[item.unit]}</span>
                        {item.supplier && <span>{item.supplier}</span>}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            const qty = prompt('Mennyiség:', '10');
                            if (qty) {
                              restockItem(item.id, parseInt(qty), item.unit_cost * parseInt(qty));
                            }
                          }}
                        >
                          <ShoppingCart size={14} className="mr-1" />
                          Beszerzés
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeView === 'recipes' && (
        <div className="space-y-4">
          {products.length === 0 ? (
            <EmptyState
              icon={<ChefHat size={48} />}
              title="Nincsenek termékek"
              description="Először adjon hozzá termékeket a menühöz"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => {
                const hasRecipe = product.recipe && product.recipe.length > 0;
                return (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowRecipeModal(true);
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ChefHat size={32} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-gray-500">{product.price.toLocaleString('hu-HU')} Ft</p>
                        <div className="mt-2">
                          {hasRecipe ? (
                            <Badge variant="success">
                              {product.recipe?.length} alapanyag
                            </Badge>
                          ) : (
                            <Badge variant="warning">Nincs recept</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeView === 'alerts' && (
        <div className="space-y-4">
          {lowStockItems.length === 0 ? (
            <EmptyState
              icon={<Package size={48} />}
              title="Nincs riasztás"
              description="Minden alapanyagból van elegendő készlet"
            />
          ) : (
            <Card padding="none">
              <Table
                data={lowStockItems}
                columns={[
                  { key: 'name', header: 'Alapanyag' },
                  {
                    key: 'current_stock',
                    header: 'Készlet',
                    render: (item) => (
                      <span className="text-red-600 font-medium">
                        {item.current_stock}
                      </span>
                    ),
                  },
                  {
                    key: 'min_stock',
                    header: 'Minimum',
                    render: (item) => <span>{item.min_stock}</span>,
                  },
                  {
                    key: 'percent',
                    header: 'Százalék',
                    render: (item) => (
                      <Badge variant={item.shortage_percent <= 10 ? 'error' : 'warning'}>
                        {item.shortage_percent}%
                      </Badge>
                    ),
                  },
                  {
                    key: 'actions',
                    header: '',
                    render: (item) => (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const qty = prompt('Mennyiség:', '10');
                          if (qty) {
                            restockItem(item.id, parseInt(qty), 0);
                          }
                        }}
                      >
                        <ShoppingCart size={14} className="mr-1" />
                        Beszerzés
                      </Button>
                    ),
                  },
                ]}
              />
            </Card>
          )}
        </div>
      )}

      {activeView === 'transactions' && (
        <div className="space-y-4">
          <EmptyState
            icon={<History size={48} />}
            title="Tranzakciók naplója"
            description="Itt jelennek meg a készletmozgások"
          />
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Új alapanyag"
      >
        <ItemForm
          onSubmit={handleCreateItem}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Alapanyag szerkesztése"
      >
        <ItemForm
          initialData={editingItem || undefined}
          onSubmit={handleUpdateItem}
          onCancel={() => setEditingItem(null)}
        />
      </Modal>

      {/* Recipe Modal */}
      <Modal
        isOpen={showRecipeModal}
        onClose={() => {
          setShowRecipeModal(false);
          setSelectedProduct(null);
        }}
        title={selectedProduct?.name ? `Recept: ${selectedProduct.name}` : 'Recept'}
        size="lg"
      >
        {selectedProduct && (
          <RecipeEditor
            product={selectedProduct}
            inventoryItems={items}
            onSave={async (ingredients: RecipeIngredient[]) => {
              try {
                // Delete existing
                await supabase
                  .from('recipe_ingredients')
                  .delete()
                  .eq('product_id', selectedProduct.id);

                // Insert new
                if (ingredients.length > 0) {
                  const { error } = await supabase.from('recipe_ingredients').insert(
                    ingredients.map((ing) => ({
                      tenant_id: tenant?.id,
                      product_id: selectedProduct.id,
                      inventory_item_id: ing.inventory_item_id,
                      quantity: ing.quantity,
                      unit: ing.unit,
                    }))
                  );
                  if (error) throw error;
                }

                toast.success('Recept mentve');
                setShowRecipeModal(false);
                loadData();
              } catch (error) {
                console.error('Failed to save recipe:', error);
                toast.error('Nem sikerült menteni');
              }
            }}
            onClose={() => {
              setShowRecipeModal(false);
              setSelectedProduct(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

interface ItemFormProps {
  initialData?: Partial<InventoryItem>;
  onSubmit: (data: Partial<InventoryItem>) => void;
  onCancel: () => void;
}

function ItemForm({ initialData, onSubmit, onCancel }: ItemFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    sku: initialData?.sku || '',
    unit: initialData?.unit || 'db',
    current_stock: initialData?.current_stock || 0,
    min_stock: initialData?.min_stock || 10,
    unit_cost: initialData?.unit_cost || 0,
    supplier: initialData?.supplier || '',
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(formData);
      }}
      className="space-y-4"
    >
      <Input
        label="Név *"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Input label="SKU" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
        <Select
          label="Mértékegység *"
          value={formData.unit}
          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
          options={[
            { value: 'db', label: 'darab' },
            { value: 'kg', label: 'kilogramm' },
            { value: 'g', label: 'gramm' },
            { value: 'l', label: 'liter' },
            { value: 'ml', label: 'milliliter' },
            { value: 'csomag', label: 'csomag' },
            { value: 'adag', label: 'adag' },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Jelenlegi készlet"
          type="number"
          value={formData.current_stock.toString()}
          onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) })}
        />
        <Input
          label="Min. készlet *"
          type="number"
          value={formData.min_stock.toString()}
          onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Egységár (Ft)"
          type="number"
          value={formData.unit_cost.toString()}
          onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) })}
        />
        <Input
          label="Beszállító"
          value={formData.supplier}
          onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
        />
      </div>
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onCancel} type="button" className="flex-1">
          Mégse
        </Button>
        <Button type="submit" className="flex-1">
          {initialData ? 'Mentés' : 'Létrehozás'}
        </Button>
      </div>
    </form>
  );
}

interface RecipeEditorProps {
  product: Product;
  inventoryItems: InventoryItem[];
  onSave: (ingredients: RecipeIngredient[]) => void;
  onClose: () => void;
}

function RecipeEditor({ product, inventoryItems, onSave, onClose }: RecipeEditorProps) {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(product.recipe || []);

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        id: '',
        tenant_id: '',
        product_id: product.id,
        inventory_item_id: inventoryItems[0]?.id || '',
        quantity: 1,
        unit: inventoryItems[0]?.unit || 'db',
      },
    ]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {ingredients.map((ing, idx) => {
          const item = inventoryItems.find((i) => i.id === ing.inventory_item_id);
          return (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <Select
                  value={ing.inventory_item_id}
                  onChange={(e) => {
                    const selected = inventoryItems.find((i) => i.id === e.target.value);
                    updateIngredient(idx, 'inventory_item_id', e.target.value);
                    if (selected) updateIngredient(idx, 'unit', selected.unit);
                  }}
                  options={[
                    { value: '', label: 'Válasszon...' },
                    ...inventoryItems.map((i) => ({ value: i.id, label: i.name })),
                  ]}
                />
              </div>
              <Input
                type="number"
                value={ing.quantity.toString()}
                onChange={(e) => updateIngredient(idx, 'quantity', parseFloat(e.target.value))}
                min={0}
                step="0.01"
                className="w-20"
              />
              <span className="text-sm text-gray-500 w-16">{item?.unit || 'db'}</span>
              <button onClick={() => removeIngredient(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <Button variant="outline" onClick={addIngredient} className="w-full">
        <Plus size={16} className="mr-2" />
        Alapanyag hozzáadása
      </Button>

      <div className="flex gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Mégse
        </Button>
        <Button onClick={() => onSave(ingredients)} className="flex-1">
          Mentés
        </Button>
      </div>
    </div>
  );
}
