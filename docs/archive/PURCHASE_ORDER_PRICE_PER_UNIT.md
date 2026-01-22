# 💰 Purchase Order: Price per Unit & Price Total

## ✨ New Pricing Structure

Purchase Orders now have a clearer pricing structure with **Price per Unit** and **Price Total** (auto-calculated)!

## 📊 What Changed?

### Before
```
┌────────────────────────────────────┐
│ Material Name: Paint               │
│ Quantity: 10 gallons               │
│ Cost: $500  ❓ (What is this?)      │
└────────────────────────────────────┘

PROBLEM:
❌ Unclear what "cost" means
❌ Is it per unit or total?
❌ Hard to compare unit prices
❌ Manual calculation needed
```

### After
```
┌────────────────────────────────────┐
│ Material Name: Paint               │
│ Quantity: 10 gallons               │
│ Price per Unit: $50 ✅             │
│ Price Total: $500 ✅ (auto!)       │
└────────────────────────────────────┘

BENEFITS:
✅ Clear unit pricing
✅ Automatic total calculation
✅ Easy price comparison
✅ Professional structure
```

## 🎯 How It Works

### Formula

```
Price Total = Quantity × Price per Unit
```

### Example 1: Paint

```
Material: White Paint
Quantity: 10 gallons
Price per Unit: $50/gallon

→ Price Total: 10 × $50 = $500 ✅ (auto-calculated)
```

### Example 2: Tiles

```
Material: Ceramic Tiles
Quantity: 50 sqm
Price per Unit: $40/sqm

→ Price Total: 50 × $40 = $2,000 ✅ (auto-calculated)
```

### Example 3: Wood

```
Material: Oak Planks
Quantity: 25 pieces
Price per Unit: $120/piece

→ Price Total: 25 × $120 = $3,000 ✅ (auto-calculated)
```

## 📍 Where to See It

### In Purchase Orders Table

```
┌────────────────────────────────────────────────────────────┐
│ Material      │ Qty    │ Price/Unit │ Price Total │ Status │
├────────────────────────────────────────────────────────────┤
│ Paint White   │ 10 gal │ $50.00     │ $500.00     │ Paid   │
│ Tiles Ceramic │ 50 sqm │ $40.00     │ $2,000.00   │ Order. │
│ Oak Planks    │ 25 pc  │ $120.00    │ $3,000.00   │ New    │
└────────────────────────────────────────────────────────────┘

TOTAL: $5,500.00
```

### In Create/Edit Dialog

```
┌─────────────────────────────────────┐
│ Add Purchase Order                  │
├─────────────────────────────────────┤
│ Material Name *                     │
│ [Paint White_____________]          │
│                                     │
│ Quantity *        Unit *            │
│ [10_______]       [gallons__]       │
│                                     │
│ Price per Unit (Optional)           │
│ [50.00_________________]            │
│ Price Total: $500.00 ✅             │ ← Live calculation!
│                                     │
│ [Create Purchase Order]             │
└─────────────────────────────────────┘
```

## 💡 Usage Examples

### Example 1: Kitchen Renovation

**Purchase Order: Kitchen Cabinets**

```
Material: IKEA SEKTION Cabinets
Quantity: 12 pieces
Unit: pieces
Price per Unit: $375
Price Total: $4,500 ✅ (auto)

Timeline:
- Jan 5: Created
- Jan 7: Ordered from IKEA
- Jan 7: Paid ($4,500)
- Jan 14: Delivered
- Jan 20: Installed
```

**Benefits:**
- Easy to see unit price ($375/cabinet)
- Compare with other brands
- Total automatically calculated
- Clear budget tracking

### Example 2: Bathroom Tiles

**Purchase Order: Porcelain Tiles**

```
Material: Porcelain Floor Tiles 30x60cm
Quantity: 50 sqm
Unit: sqm
Price per Unit: $40
Price Total: $2,000 ✅ (auto)

Calculation Shown:
"Price Total: $2,000.00"
(50 sqm × $40/sqm = $2,000)
```

**Benefits:**
- Know exact price per square meter
- Easy to calculate for different areas
- Compare suppliers easily
- Budget per room calculation

### Example 3: Paint Order

**Purchase Order 1: White Paint**

```
Material: White Paint Interior
Quantity: 10 gallons
Unit: gallons
Price per Unit: $50
Price Total: $500 ✅
```

**Purchase Order 2: Blue Paint**

```
Material: Blue Paint Accent
Quantity: 3 gallons
Unit: gallons
Price per Unit: $60
Price Total: $180 ✅
```

**Total Paint Budget: $680**

**Benefits:**
- Compare prices between colors
- Easy to add more if needed
- Clear unit economics

### Example 4: Bulk Wood Order

**Purchase Order: Lumber**

```
Material: 2x4 Pine Studs 8ft
Quantity: 100 pieces
Unit: pieces
Price per Unit: $8.50
Price Total: $850 ✅

→ If price drops to $8/piece:
  Updated Price per Unit: $8.00
  New Price Total: $800 ✅ (auto-updates!)
```

## 🎓 Best Practices

### 1. Always Enter Price per Unit

```
✅ GOOD:
Material: Paint
Quantity: 10 gallons
Price per Unit: $50
Price Total: $500 (auto)

→ Clear unit economics!
```

### 2. Use Consistent Units

```
✅ GOOD:
Tiles 1: 50 sqm @ $40/sqm = $2,000
Tiles 2: 30 sqm @ $45/sqm = $1,350

→ Easy to compare!

❌ BAD:
Tiles 1: 50 sqm @ $40/sqm = $2,000
Tiles 2: 323 sqft @ $4.18/sqft = $1,350

→ Hard to compare (different units)
```

### 3. Compare Suppliers

```
SUPPLIER A:
Material: Oak Flooring
Quantity: 30 sqm
Price per Unit: $85/sqm
Price Total: $2,550

SUPPLIER B:
Material: Oak Flooring (same)
Quantity: 30 sqm
Price per Unit: $78/sqm
Price Total: $2,340

SAVINGS: $210 ✅

→ Easy decision!
```

### 4. Plan for Different Quantities

```
SCENARIO 1 - Small Room:
Quantity: 15 sqm
Price per Unit: $40/sqm
Price Total: $600

SCENARIO 2 - Large Room:
Quantity: 50 sqm
Price per Unit: $40/sqm
Price Total: $2,000

→ Just change quantity, total updates!
```

### 5. Bulk Discounts

```
REGULAR PRICE:
Quantity: 10 pieces
Price per Unit: $50
Price Total: $500

WITH 10% BULK DISCOUNT:
Quantity: 10 pieces
Price per Unit: $45 (discounted)
Price Total: $450 ✅

SAVINGS: $50
```

## 📊 Budget Tracking

### Project Budget Overview

```
PROJECT: Kitchen Renovation
Budget: $15,000

PURCHASE ORDERS:
┌────────────────────────────────────────────┐
│ Cabinets      │ 12 pc  │ $375  │ $4,500   │
│ Countertop    │ 1 unit │ $2,500│ $2,500   │
│ Appliances    │ 1 set  │ $3,000│ $3,000   │
│ Tiles         │ 20 sqm │ $40   │ $800     │
│ Paint         │ 5 gal  │ $50   │ $250     │
├────────────────────────────────────────────┤
│ TOTAL SPENT:                    $11,050    │
│ BUDGET REMAINING:               $3,950     │
└────────────────────────────────────────────┘

→ 73.7% of budget used
→ Clear financial overview!
```

### By Room Budget

```
BATHROOM RENOVATION:

TILES:
- Floor: 15 sqm × $40/sqm = $600
- Wall: 25 sqm × $30/sqm = $750
  Subtotal Tiles: $1,350

FIXTURES:
- Sink: 1 × $450 = $450
- Toilet: 1 × $350 = $350
- Shower: 1 × $800 = $800
  Subtotal Fixtures: $1,600

PAINT:
- White Paint: 3 gal × $50/gal = $150

TOTAL BATHROOM: $3,100
```

## 🔧 Database Structure

### Column Changes

```sql
-- OLD:
cost DECIMAL(12, 2)  -- Ambiguous

-- NEW:
price_per_unit DECIMAL(12, 2)  -- Clear unit price
price_total DECIMAL(12, 2) GENERATED ALWAYS AS (
  CASE 
    WHEN quantity IS NOT NULL AND price_per_unit IS NOT NULL 
    THEN quantity * price_per_unit 
    ELSE NULL 
  END
) STORED  -- Auto-calculated, always correct!
```

### Auto-Calculation Benefits

```
✅ Always accurate (database enforced)
✅ No manual errors
✅ Updates automatically if quantity changes
✅ Updates automatically if price_per_unit changes
✅ Consistent across all queries
```

### Example: Update Quantity

```sql
-- Before:
quantity: 10
price_per_unit: $50
price_total: $500

-- Update quantity to 15:
UPDATE materials SET quantity = 15 WHERE id = '...';

-- After (automatic):
quantity: 15
price_per_unit: $50
price_total: $750 ✅ (auto-updated!)
```

## 💻 UI Features

### Live Calculation in Forms

When creating or editing a purchase order, the total updates live as you type:

```
Quantity: [10______]
Price per Unit: [50.00______]

→ Price Total: $500.00 ✅ (updates as you type!)
```

### Table Display

```
┌──────────────────────────────────────────┐
│ Material  │ Qty │ Price/Unit │ Total    │
├──────────────────────────────────────────┤
│ Paint     │ 10  │ $50.00     │ $500.00  │ ← Total in bold
└──────────────────────────────────────────┘
```

### Budget Calculations

All budget calculations now use `price_total` directly:

```javascript
// Project budget spent
const totalSpent = materials.reduce((sum, material) => 
  sum + (material.price_total || 0), 0
);

// Simple, accurate, fast!
```

## 🚀 Setup (1 minute)

### Step 1: Run SQL Migration

```bash
# Supabase Dashboard → SQL Editor
# Run: supabase/add_price_per_unit_and_total.sql
```

This will:
- Rename `cost` → `price_per_unit`
- Add `price_total` (auto-calculated)
- Update all UI references

### Step 2: Refresh App

```bash
# Refresh browser (F5)
```

### Step 3: Test!

```
1. Open project → Tasks → Task with purchase orders
2. Click "Add Purchase Order"
3. Fill in:
   - Material Name: Paint
   - Quantity: 10
   - Unit: gallons
   - Price per Unit: 50
4. See: "Price Total: $500.00" ✅
5. Save
6. Table shows both Price/Unit and Price Total ✅
```

## 🧪 Testing Scenarios

### Test 1: Create New Purchase Order

```
Input:
- Material: Ceramic Tiles
- Quantity: 50
- Unit: sqm
- Price per Unit: 40

Expected:
- Price Total shows: $2,000.00 ✅
- Saves correctly
- Table displays both values
```

### Test 2: Edit Existing Purchase Order

```
Original:
- Quantity: 10
- Price per Unit: $50
- Price Total: $500

Change Quantity to 15:
- New Price Total: $750 ✅ (auto-updates)

Change Price per Unit to $45:
- New Price Total: $675 ✅ (auto-updates)
```

### Test 3: Budget Calculation

```
Purchase Orders:
1. Paint: 10 gal × $50 = $500
2. Tiles: 50 sqm × $40 = $2,000
3. Wood: 25 pc × $120 = $3,000

Expected Total: $5,500 ✅
```

## 📈 Benefits Summary

### Clarity
- ✅ Clear unit pricing
- ✅ No ambiguity (unit vs total)
- ✅ Professional structure

### Accuracy
- ✅ Auto-calculated totals
- ✅ No manual errors
- ✅ Always up-to-date

### Comparison
- ✅ Easy to compare suppliers
- ✅ Easy to compare materials
- ✅ Easy to compare bulk prices

### Budget Management
- ✅ Clear total costs
- ✅ Accurate project budgets
- ✅ Per-room calculations

### Professional
- ✅ Industry-standard format
- ✅ Clear invoices
- ✅ Audit-friendly

## ✅ Compatibility

### Old Data

If you have existing purchase orders with the old `cost` field:
- ✅ Automatically migrated to `price_per_unit`
- ✅ `price_total` calculated for existing quantity
- ✅ No data loss
- ✅ Seamless transition

### New Data

All new purchase orders will use:
- Price per Unit (manual entry)
- Price Total (auto-calculated)

## 🎯 Use Cases

### Use Case 1: Shopping Multiple Suppliers

```
COMPARING SUPPLIERS:

Home Depot:
- Paint: $52/gallon
- Need: 10 gallons
- Total: $520

Lowe's:
- Paint: $48/gallon (sale!)
- Need: 10 gallons
- Total: $480

CHOOSE LOWE'S → SAVE $40 ✅
```

### Use Case 2: Scaling Projects

```
SMALL BATHROOM:
- Tiles needed: 15 sqm
- Price: $40/sqm
- Total: $600

LARGE BATHROOM:
- Tiles needed: 30 sqm
- Price: $40/sqm (same supplier)
- Total: $1,200

→ Easy to scale!
```

### Use Case 3: Budget Planning

```
PHASE 1 - Essential:
- Cabinets: 8 × $375 = $3,000
- Countertop: 1 × $2,000 = $2,000
- Sink: 1 × $450 = $450
Total Phase 1: $5,450

PHASE 2 - Nice-to-have:
- Extra Cabinets: 4 × $375 = $1,500
- Upgrade Countertop: +$500 = $500
Total Phase 2: $2,000

TOTAL PROJECT: $7,450
```

## 📚 Related Documentation

- `PURCHASE_ORDER_PAID_STATUS.md` - Paid status feature
- `PURCHASE_ORDER_STATUS_COMPARISON.md` - Status workflow
- `SNABBSTART_PAID_STATUS.md` - Quick start guide

---

**Professional pricing structure for purchase orders!** 💰✅

**Setup:** Run `add_price_per_unit_and_total.sql` and refresh! 🚀

**Benefits:**
- Clear unit pricing
- Automatic totals
- Easy comparisons
- Professional structure
