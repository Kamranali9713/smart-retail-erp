const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

const MODULES = ["dashboard","pos","inventory","purchases","customers","vendors","accounting","reports","settings","users","backups"];
const ACTIONS = ["view","create","edit","delete"];
const money = (n) => Number(Number(n).toFixed(2));

async function main() {
  console.log("Seeding Smart Retail Phase 4...");

  const permissions = [];
  for (const module of MODULES) for (const action of ACTIONS) {
    permissions.push(await prisma.permission.upsert({ where: { module_action: { module, action } }, update: {}, create: { module, action } }));
  }

  const roleDefs = [
    { name:"SUPER_ADMIN", label:"Super Admin", modules:MODULES },
    { name:"MANAGER", label:"Manager", modules:["dashboard","pos","inventory","purchases","customers","vendors","reports"] },
    { name:"CASHIER", label:"Cashier", modules:["pos","customers"] },
    { name:"ACCOUNTANT", label:"Accountant", modules:["dashboard","accounting","customers","vendors","reports"] },
    { name:"INVENTORY_STAFF", label:"Inventory Staff", modules:["inventory","purchases","vendors"] },
  ];
  const roles = {};
  for (const def of roleDefs) {
    const rolePermissions = permissions.filter(p => def.modules.includes(p.module));
    roles[def.name] = await prisma.role.upsert({
      where:{name:def.name}, update:{label:def.label, permissions:{set:rolePermissions.map(p=>({id:p.id}))}},
      create:{name:def.name,label:def.label,permissions:{connect:rolePermissions.map(p=>({id:p.id}))}}
    });
  }

  const adminPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123", 10);
  const testPassword = await bcrypt.hash(process.env.DEFAULT_TEST_PASSWORD || "Test@123", 10);
  const users = [
    ["Super Admin", process.env.DEFAULT_ADMIN_EMAIL || "admin@smartretail.local", "SUPER_ADMIN", adminPassword],
    ["Manager User", "manager@smartretail.local", "MANAGER", testPassword],
    ["Cashier User", "cashier@smartretail.local", "CASHIER", testPassword],
    ["Accountant User", "accountant@smartretail.local", "ACCOUNTANT", testPassword],
    ["Inventory User", "inventory@smartretail.local", "INVENTORY_STAFF", testPassword],
  ];
  const userMap = {};
  for (const [name,email,role,password] of users) userMap[role] = await prisma.user.upsert({where:{email},update:{name,password,roleId:roles[role].id,isActive:true},create:{name,email,password,roleId:roles[role].id}});

  const categoryNames = ["Beverages","Snacks","Grocery","Stationery","Cleaning","Personal Care","Electronics","Household"];
  const categories = {};
  for (const name of categoryNames) categories[name] = await prisma.category.upsert({where:{name},update:{},create:{name}});
  const units = {};
  for (const name of ["pcs","box","pack","kg","litre","dozen"]) units[name] = await prisma.unit.upsert({where:{name},update:{},create:{name}});
  const brandNames = ["Coca-Cola","Pepsi","Nestle","Lays","Surf","Dove","Pilot","Samsung"];
  const brands = {};
  for (const name of brandNames) brands[name] = await prisma.brand.upsert({where:{name},update:{},create:{name}});

  const productDefs = [
    ["Coca-Cola 500ml","BEV-0001","Beverages","Coca-Cola","pcs",55,90,5,100],
    ["Pepsi 500ml","BEV-0002","Beverages","Pepsi","pcs",50,85,5,90],
    ["Mineral Water 1.5L","BEV-0003","Beverages","Nestle","pcs",45,70,0,120],
    ["Lays Masala 150g","SNK-0001","Snacks","Lays","pack",85,130,5,70],
    ["Lays Salt 150g","SNK-0002","Snacks","Lays","pack",85,130,5,65],
    ["Milk Powder 500g","GRO-0001","Grocery","Nestle","pcs",650,780,5,40],
    ["Tea 450g","GRO-0002","Grocery","Nestle","pcs",720,850,5,35],
    ["Washing Powder 1kg","CLN-0001","Cleaning","Surf","pcs",310,390,5,50],
    ["Dishwash Liquid 500ml","CLN-0002","Cleaning","Surf","pcs",180,250,5,45],
    ["Bath Soap 100g","PER-0001","Personal Care","Dove","pcs",90,125,5,80],
    ["Ball Pen Blue","STA-0001","Stationery","Pilot","pcs",25,40,0,150],
    ["Notebook A4","STA-0002","Stationery","Pilot","pcs",110,160,0,75],
    ["USB Charger 20W","ELE-0001","Electronics","Samsung","pcs",850,1100,18,25],
    ["USB Cable Type-C","ELE-0002","Electronics","Samsung","pcs",300,450,18,35],
    ["LED Bulb 12W","HOU-0001","Household","Samsung","pcs",180,260,18,60],
    ["Storage Box","HOU-0002","Household","Samsung","pcs",420,550,5,30],
  ];
  const products = {};
  for (const [name,sku,cat,brand,unit,cost,price,tax,stock] of productDefs) {
    const expiry = ["BEV-0001","BEV-0002","GRO-0001","PER-0001"].includes(sku) ? new Date(Date.now() + 1000 * 60 * 60 * 24 * (45 + (Number(sku.slice(-1)) || 1) * 20)) : null;
    products[sku] = await prisma.product.upsert({
      where:{sku},
      update:{name,description:`Demo ${name} for development and QA testing`,images:[`https://placehold.co/600x400?text=${encodeURIComponent(name)}`],costPrice:cost,sellingPrice:price,taxRate:tax,lowStockAlert:10,categoryId:categories[cat].id,brandId:brands[brand].id,unitId:units[unit].id,expiryDate:expiry,isActive:true},
      create:{name,sku,description:`Demo ${name} for development and QA testing`,images:[`https://placehold.co/600x400?text=${encodeURIComponent(name)}`],categoryId:categories[cat].id,brandId:brands[brand].id,unitId:units[unit].id,costPrice:cost,sellingPrice:price,taxRate:tax,lowStockAlert:10,expiryDate:expiry,isActive:true}
    });
  }
  await prisma.productVariant.deleteMany();
  for (const [sku, names] of Object.entries({
    "ELE-0001":["Black","White"],
    "ELE-0002":["1m","2m"],
    "HOU-0002":["Small","Large"],
    "STA-0002":["Single","Pack of 5"]
  })) {
    for (const name of names) {
      const product = products[sku];
      await prisma.productVariant.create({data:{productId:product.id,name,skuSuffix:name.toUpperCase().replace(/[^A-Z0-9]+/g,"-"),priceDiff:name.includes("Large")||name.includes("5")?50:0}});
    }
  }

  // Reset transactional demo data so re-seeding remains deterministic.
  await prisma.return.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.vendorPayment.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.income.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.stock.deleteMany();
  for (const sku of Object.keys(products)) await prisma.stock.create({data:{productId:products[sku].id,quantity:0}});

  const customerDefs = Array.from({length:30},(_,i)=>({name:`Demo Customer ${String(i+1).padStart(2,"0")}`,phone:`0300-555${String(i+1).padStart(4,"0")}`,email:`customer${i+1}@demo.local`,address:`${i+1} Main Market, Rawalpindi`}));
  const customers=[];
  for(const c of customerDefs){let existing=await prisma.customer.findFirst({where:{email:c.email}}); if(!existing) existing=await prisma.customer.create({data:c}); else existing=await prisma.customer.update({where:{id:existing.id},data:c}); customers.push(existing);}

  const vendorDefs = Array.from({length:15},(_,i)=>({name:`Demo Supplier ${String(i+1).padStart(2,"0")}`,contact:`0321-777${String(i+1).padStart(4,"0")}`,email:`supplier${i+1}@demo.local`,address:`Industrial Area ${i+1}, Rawalpindi`,status:"ACTIVE"}));
  const vendors=[];
  for(const v of vendorDefs){let existing=await prisma.vendor.findFirst({where:{email:v.email}}); if(!existing) existing=await prisma.vendor.create({data:v}); else existing=await prisma.vendor.update({where:{id:existing.id},data:v}); vendors.push(existing);}

  const productList = Object.values(products);
  // Opening stock and ledger.
  for (let i=0;i<productList.length;i++) {
    const qty = productDefs[i][8];
    await prisma.stock.update({where:{productId:productList[i].id},data:{quantity:qty}});
    await prisma.inventoryLog.create({data:{productId:productList[i].id,action:"STOCK_IN",quantity:qty,reason:"Opening stock - demo seed"}});
  }

  // Demo purchases received; they increase stock and populate purchase ledger.
  for(let i=0;i<8;i++){
    const items=[0,1,2].map((offset)=>{const p=productList[(i*2+offset)%productList.length];const quantity=10+i*2+offset;return {productId:p.id,quantity,unitCost:Number(p.costPrice),total:money(quantity*Number(p.costPrice))};});
    const total=money(items.reduce((s,x)=>s+x.total,0));
    const paid=i%2===0?total/2:0;
    const purchase=await prisma.purchase.create({data:{invoiceNo:`PUR-DEMO-${String(i+1).padStart(4,"0")}`,vendorId:vendors[i%vendors.length].id,userId:userMap.INVENTORY_STAFF.id,status:"RECEIVED",totalAmount:total,paidAmount:paid,items:{create:items}}});
    for(const item of items){await prisma.stock.update({where:{productId:item.productId},data:{quantity:{increment:item.quantity}}});await prisma.inventoryLog.create({data:{productId:item.productId,action:"PURCHASE",quantity:item.quantity,reason:`Purchase ${purchase.invoiceNo}`,refId:purchase.id}});}
  }

  // Additional purchase statuses so every workflow state is represented in the demo UI.
  const pendingItems = [{productId:productList[8].id,quantity:6,unitCost:Number(productList[8].costPrice),total:6*Number(productList[8].costPrice)}];
  await prisma.purchase.create({data:{invoiceNo:"PUR-DEMO-PENDING",vendorId:vendors[8].id,userId:userMap.MANAGER.id,status:"PENDING",totalAmount:pendingItems[0].total,paidAmount:0,items:{create:pendingItems}}});
  const cancelledItems = [{productId:productList[9].id,quantity:4,unitCost:Number(productList[9].costPrice),total:4*Number(productList[9].costPrice)}];
  await prisma.purchase.create({data:{invoiceNo:"PUR-DEMO-CANCELLED",vendorId:vendors[9].id,userId:userMap.MANAGER.id,status:"CANCELLED",totalAmount:cancelledItems[0].total,paidAmount:0,items:{create:cancelledItems}}});

  const accountDefs=[
    ["Cash","ASSET"],["Bank","ASSET"],["Inventory","ASSET"],["Accounts Receivable","ASSET"],["Accounts Payable","LIABILITY"],["Owner Equity","EQUITY"],["Sales Revenue","REVENUE"],["Other Income","REVENUE"],["Cost of Goods Sold","EXPENSE"],["Operating Expenses","EXPENSE"],["Utilities Expense","EXPENSE"],["Rent Expense","EXPENSE"]
  ];
  const accounts={};
  for(const [name,type] of accountDefs){ const existing=await prisma.account.findFirst({where:{name}}); accounts[name]=existing ? await prisma.account.update({where:{id:existing.id},data:{type,balance:0}}) : await prisma.account.create({data:{name,type,balance:0}}); }

  // Post accounting for all received demo purchases.
  const seededPurchases = await prisma.purchase.findMany({ orderBy: { createdAt: "asc" } });
  for (const purchase of seededPurchases) {
    await prisma.transaction.create({data:{accountId:accounts.Inventory.id,type:"DEBIT",amount:purchase.totalAmount,description:`Purchase ${purchase.invoiceNo}`,refType:"PURCHASE",refId:purchase.id}});
    if (Number(purchase.paidAmount) > 0) {
      await prisma.transaction.create({data:{accountId:accounts.Cash.id,type:"CREDIT",amount:purchase.paidAmount,description:`Purchase payment ${purchase.invoiceNo}`,refType:"PURCHASE",refId:purchase.id}});
    }
    const due = Math.max(0, Number(purchase.totalAmount) - Number(purchase.paidAmount));
    if (due > 0) await prisma.transaction.create({data:{accountId:accounts["Accounts Payable"].id,type:"CREDIT",amount:due,description:`Payable ${purchase.invoiceNo}`,refType:"PURCHASE",refId:purchase.id}});
  }

  // Demo sales, stock movement and accounting transactions.
  for(let i=0;i<12;i++){
    const p1=productList[i%productList.length], p2=productList[(i+3)%productList.length];
    const q1=2+(i%4), q2=1+(i%3); const s1=money(q1*Number(p1.sellingPrice)), s2=money(q2*Number(p2.sellingPrice));
    const subtotal=money(s1+s2); const tax=money((s1*Number(p1.taxRate)/100)+(s2*Number(p2.taxRate)/100)); const total=money(subtotal+tax); const method=i%3===0?"BANK_TRANSFER":i%3===1?"CARD":"CASH";
    const sale=await prisma.sale.create({data:{invoiceNo:`INV-DEMO-${String(i+1).padStart(4,"0")}`,customerId:customers[i%customers.length].id,userId:userMap.CASHIER.id,subtotal,taxAmount:tax,totalAmount:total,paymentMethod:method,status:"COMPLETED",items:{create:[{productId:p1.id,quantity:q1,unitPrice:p1.sellingPrice,total:s1},{productId:p2.id,quantity:q2,unitPrice:p2.sellingPrice,total:s2}]}}});
    for(const item of [{p:p1,q:q1},{p:p2,q:q2}]){await prisma.stock.update({where:{productId:item.p.id},data:{quantity:{decrement:item.q}}});await prisma.inventoryLog.create({data:{productId:item.p.id,action:"SALE",quantity:item.q,reason:`Sale ${sale.invoiceNo}`,refId:sale.id}});}
    const cashAcct=method==="CASH"?accounts.Cash:accounts.Bank;
    const cost=money(q1*Number(p1.costPrice)+q2*Number(p2.costPrice));
    await prisma.transaction.createMany({data:[
      {accountId:cashAcct.id,type:"DEBIT",amount:total,description:`Sale ${sale.invoiceNo}`,refType:"SALE",refId:sale.id},
      {accountId:accounts["Sales Revenue"].id,type:"CREDIT",amount:total,description:`Sale ${sale.invoiceNo}`,refType:"SALE",refId:sale.id},
      {accountId:accounts["Cost of Goods Sold"].id,type:"DEBIT",amount:cost,description:`COGS ${sale.invoiceNo}`,refType:"SALE",refId:sale.id},
      {accountId:accounts.Inventory.id,type:"CREDIT",amount:cost,description:`Inventory ${sale.invoiceNo}`,refType:"SALE",refId:sale.id}
    ]});
  }

  // Inventory adjustment/stock-out examples for the Stock Ledger.
  const adjustmentProduct = productList[15];
  await prisma.stock.update({where:{productId:adjustmentProduct.id},data:{quantity:{decrement:2}}});
  await prisma.inventoryLog.create({data:{productId:adjustmentProduct.id,action:"ADJUSTMENT",quantity:2,reason:"Damaged stock - demo adjustment"}});
  const stockOutProduct = productList[14];
  await prisma.stock.update({where:{productId:stockOutProduct.id},data:{quantity:{decrement:1}}});
  await prisma.inventoryLog.create({data:{productId:stockOutProduct.id,action:"STOCK_OUT",quantity:1,reason:"Internal sample use - demo"}});

  // Held sale demonstrates a POS cart that has not yet affected stock or accounting.
  const heldProduct = productList[10];
  await prisma.sale.create({data:{invoiceNo:"INV-DEMO-HELD",customerId:customers[0].id,userId:userMap.CASHIER.id,subtotal:Number(heldProduct.sellingPrice),taxAmount:0,totalAmount:Number(heldProduct.sellingPrice),paymentMethod:"CASH",status:"HELD",items:{create:[{productId:heldProduct.id,quantity:1,unitPrice:heldProduct.sellingPrice,total:heldProduct.sellingPrice}]}}});

  // One returned sale gives the return screen and ledgers a realistic test case.
  const returnSale = await prisma.sale.findFirst({where:{invoiceNo:"INV-DEMO-001"},include:{items:true}});
  if (returnSale) {
    await prisma.sale.update({where:{id:returnSale.id},data:{status:"RETURNED"}});
    const returnAmount=Number(returnSale.totalAmount);
    await prisma.return.create({data:{saleId:returnSale.id,reason:"Demo customer return",amount:returnAmount}});
    for (const item of returnSale.items) {
      await prisma.stock.update({where:{productId:item.productId},data:{quantity:{increment:item.quantity}}});
      await prisma.inventoryLog.create({data:{productId:item.productId,action:"RETURN",quantity:item.quantity,reason:`Return ${returnSale.invoiceNo}`,refId:returnSale.id}});
    }
    const methodAccount=returnSale.paymentMethod==="CASH"?accounts.Cash:accounts.Bank;
    const returnCost=money(returnSale.items.reduce((sum,item)=>sum+Number(item.quantity)*Number(productList.find(p=>p.id===item.productId).costPrice),0));
    await prisma.transaction.createMany({data:[
      {accountId:accounts["Sales Revenue"].id,type:"DEBIT",amount:returnAmount,description:`Return ${returnSale.invoiceNo}`,refType:"RETURN",refId:returnSale.id},
      {accountId:methodAccount.id,type:"CREDIT",amount:returnAmount,description:`Refund ${returnSale.invoiceNo}`,refType:"RETURN",refId:returnSale.id},
      {accountId:accounts.Inventory.id,type:"DEBIT",amount:returnCost,description:`Inventory return ${returnSale.invoiceNo}`,refType:"RETURN",refId:returnSale.id},
      {accountId:accounts["Cost of Goods Sold"].id,type:"CREDIT",amount:returnCost,description:`COGS reversal ${returnSale.invoiceNo}`,refType:"RETURN",refId:returnSale.id}
    ]});
  }

  const incomeDefs=[["Delivery Service",3500],["Commission Income",2200],["Miscellaneous Income",1250]];
  for(const [source,amount] of incomeDefs){const i=await prisma.income.create({data:{source,amount,note:"Demo income"}});await prisma.transaction.createMany({data:[{accountId:accounts.Cash.id,type:"DEBIT",amount,description:source,refType:"INCOME",refId:i.id},{accountId:accounts["Other Income"].id,type:"CREDIT",amount,description:source,refType:"INCOME",refId:i.id}]});}
  const expenseDefs=[["Utilities Expense",4500],["Rent Expense",18000],["Operating Expenses",6200],["Operating Expenses",3100]];
  for(const [category,amount] of expenseDefs){const e=await prisma.expense.create({data:{category,amount,note:"Demo expense"}});const acct=accounts[category]||accounts["Operating Expenses"];await prisma.transaction.createMany({data:[{accountId:acct.id,type:"DEBIT",amount,description:category,refType:"EXPENSE",refId:e.id},{accountId:accounts.Cash.id,type:"CREDIT",amount,description:category,refType:"EXPENSE",refId:e.id}]});}

  // Vendor payments + accounting.
  const receivedPurchases=await prisma.purchase.findMany({orderBy:{createdAt:"asc"}});
  for(const p of receivedPurchases.filter(x=>Number(x.paidAmount)>0)){
    const payment=await prisma.vendorPayment.create({data:{vendorId:p.vendorId,amount:p.paidAmount,method:"CASH",note:`Payment for ${p.invoiceNo}`}});
    await prisma.transaction.createMany({data:[{accountId:accounts["Accounts Payable"].id,type:"DEBIT",amount:p.paidAmount,description:`Vendor payment ${p.invoiceNo}`,refType:"VENDOR_PAYMENT",refId:payment.id},{accountId:accounts.Cash.id,type:"CREDIT",amount:p.paidAmount,description:`Vendor payment ${p.invoiceNo}`,refType:"VENDOR_PAYMENT",refId:payment.id}]});
  }

  // Seed an opening capital entry so the balance sheet has a balancing equity source.
  const preEquityTransactions = await prisma.transaction.findMany({ include: { account: true } });
  const assetBalance = Object.values(accounts).filter(a => a.type === "ASSET").reduce((sum, account) => {
    const txs = preEquityTransactions.filter(t => t.accountId === account.id);
    return sum + txs.reduce((b, t) => b + (t.type === "DEBIT" ? Number(t.amount) : -Number(t.amount)), 0);
  }, 0);
  const liabilityBalance = Object.values(accounts).filter(a => a.type === "LIABILITY").reduce((sum, account) => {
    const txs = preEquityTransactions.filter(t => t.accountId === account.id);
    return sum + txs.reduce((b, t) => b + (t.type === "CREDIT" ? Number(t.amount) : -Number(t.amount)), 0);
  }, 0);
  const revenueBalance = Object.values(accounts).filter(a => a.type === "REVENUE").reduce((sum, account) => {
    const txs = preEquityTransactions.filter(t => t.accountId === account.id);
    return sum + txs.reduce((b, t) => b + (t.type === "CREDIT" ? Number(t.amount) : -Number(t.amount)), 0);
  }, 0);
  const expenseBalance = Object.values(accounts).filter(a => a.type === "EXPENSE").reduce((sum, account) => {
    const txs = preEquityTransactions.filter(t => t.accountId === account.id);
    return sum + txs.reduce((b, t) => b + (t.type === "DEBIT" ? Number(t.amount) : -Number(t.amount)), 0);
  }, 0);
  const openingCapital = money(assetBalance - liabilityBalance - (revenueBalance - expenseBalance));
  if (openingCapital > 0) {
    await prisma.transaction.createMany({data:[
      {accountId:accounts.Cash.id,type:"DEBIT",amount:openingCapital,description:"Opening capital",refType:"CAPITAL"},
      {accountId:accounts["Owner Equity"].id,type:"CREDIT",amount:openingCapital,description:"Opening capital",refType:"CAPITAL"}
    ]});
  }

  // Recalculate account balances from transactions so the demo ledger is internally consistent.
  for(const account of Object.values(accounts)){
    const txs=await prisma.transaction.findMany({where:{accountId:account.id}});
    let balance=0; for(const t of txs) balance += ["LIABILITY","EQUITY","REVENUE"].includes(account.type) ? (t.type==="CREDIT"?Number(t.amount):-Number(t.amount)) : (t.type==="DEBIT"?Number(t.amount):-Number(t.amount));
    await prisma.account.update({where:{id:account.id},data:{balance:money(balance)}});
  }

  // Demo audit and login history for the admin/testing screens.
  await prisma.auditLog.deleteMany();
  await prisma.loginLog.deleteMany();
  const demoUsers = Object.values(userMap);
  for (let i = 0; i < 40; i++) {
    const u = demoUsers[i % demoUsers.length];
    await prisma.loginLog.create({ data: { userId: u.id, status: i % 7 === 0 ? "FAILED" : "SUCCESS", ip: `192.168.1.${20 + (i % 30)}`, userAgent: "Mozilla/5.0 (Smart Retail Demo)" } });
  }
  const auditActions = ["CREATE","UPDATE","DELETE","LOGIN","SALE","PURCHASE","STOCK_CHANGE"];
  const auditModules = ["products","sales","purchases","inventory","accounting","users","settings"];
  for (let i = 0; i < 60; i++) {
    const u = demoUsers[i % demoUsers.length];
    await prisma.auditLog.create({ data: { userId: u.id, action: auditActions[i % auditActions.length], module: auditModules[i % auditModules.length], metadata: { demo: true, sequence: i + 1 } } });
  }
  await prisma.backup.deleteMany();
  for (let i = 0; i < 5; i++) {
    await prisma.backup.create({ data: { fileName: `smart-retail-demo-${i + 1}.sql`, sizeBytes: 125000 + i * 18750, status: i === 0 ? "COMPLETED" : "COMPLETED" } });
  }

  await prisma.settings.upsert({where:{id:"singleton"},update:{storeName:"Smart Retail Demo Store",address:"Main Market, Rawalpindi",phone:"051-5551234",email:"demo@smartretail.local",defaultTaxRate:5,receiptWidth:"80mm",lowStockThreshold:10,autoBarcode:true},create:{id:"singleton",storeName:"Smart Retail Demo Store",address:"Main Market, Rawalpindi",phone:"051-5551234",email:"demo@smartretail.local",defaultTaxRate:5,receiptWidth:"80mm",lowStockThreshold:10,autoBarcode:true}});

  console.log("Phase 4 seed complete.");
  console.log("Admin: admin@smartretail.local / Admin@123");
  console.log("Test users: manager@smartretail.local, cashier@smartretail.local, accountant@smartretail.local, inventory@smartretail.local / Test@123");
}

main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
