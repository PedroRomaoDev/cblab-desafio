CREATE DATABASE IF NOT EXISTS desafio1CocoBambu;
USE desafio1CocoBambu;

-- 1. Tabela stores
CREATE TABLE stores (
    locRef VARCHAR(50) PRIMARY KEY,
    storeName VARCHAR(255) NOT NULL,
    storeAddress VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela employees
CREATE TABLE employees (
    empNum INTEGER PRIMARY KEY,
    empName VARCHAR(255) NOT NULL,
    empRole VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locRef VARCHAR(50), -- CORRIGIDO: Deve ser VARCHAR(50) para ser FK de stores(locRef)

    FOREIGN KEY (locRef) REFERENCES stores(locRef)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. Tabela guestChecks
CREATE TABLE guestChecks (
    guestCheckId BIGINT PRIMARY KEY,
    locRef VARCHAR(50) NOT NULL,
    chkNum INTEGER NOT NULL,
    opnBusDt DATE NOT NULL,
    opnUTC TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    opnLcl TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    clsdBusDt DATE,
    clsdUTC TIMESTAMP NULL,
    clsdLcl TIMESTAMP NULL,
    lastTransUTC TIMESTAMP NULL,
    lastTransLcl TIMESTAMP NULL,
    lastUpdatedUTC TIMESTAMP NULL,
    lastUpdatedLcl TIMESTAMP NULL,
    clsdFlag BOOLEAN NOT NULL,
    gstCnt INTEGER NOT NULL,
    subTtl DECIMAL(10, 2) NOT NULL,
    nonTxblSlsTtl DECIMAL(10, 2),
    chkTtl DECIMAL(10, 2) NOT NULL,
    dscTtl DECIMAL(10, 2) NOT NULL,
    payTtl DECIMAL(10, 2) NOT NULL,
    balDueTtl DECIMAL(10, 2),
    rvcNum INTEGER NOT NULL,
    otNum INTEGER NOT NULL,
    ocNum INTEGER,
    tblNum INTEGER,
    tblName VARCHAR(50),
    empNum INTEGER NOT NULL,
    numSrvcRd INTEGER,
    numChkPrntd INTEGER,
    curUTC TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (locRef) REFERENCES stores(locRef)
    ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (empNum) REFERENCES employees(empNum)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. Tabela guestCheck_DetailLines
CREATE TABLE guestCheck_DetailLines (
    guestCheckLineItemId BIGINT PRIMARY KEY,
    guestCheckId BIGINT NOT NULL,
    rvcNum INTEGER,
    dtlOtNum INTEGER,
    dtlOcNum INTEGER,
    lineNum INTEGER NOT NULL,
    dtlId INTEGER,
    detailUTC TIMESTAMP NULL, 
    detailLcl TIMESTAMP NULL, 
    lastUpdateUTC TIMESTAMP NULL, 
    lastUpdateLcl TIMESTAMP NULL, 
    busDt DATE,
    wsNum INTEGER,
    dspTtl DECIMAL(10, 2),
    dspQty INTEGER,
    aggTtl DECIMAL(10, 2),
    aggQty INTEGER,
    chkEmpId INTEGER,
    chkEmpNum INTEGER,
    svcRndNum INTEGER,
    seatNum INTEGER,

    FOREIGN KEY (guestCheckId) REFERENCES guestChecks(guestCheckId)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 5. Tabela guestCheck_Taxes
CREATE TABLE guestCheck_Taxes (
    guestCheckTaxId BIGINT PRIMARY KEY,
    guestCheckId BIGINT NOT NULL,
    taxNum INTEGER NOT NULL,
    txblSlsTtl DECIMAL(10, 2) NOT NULL,
    taxCollTtl DECIMAL(10, 2) NOT NULL,
    taxRate DECIMAL(5, 2) NOT NULL,
    type INTEGER NOT NULL,

    FOREIGN KEY (guestCheckId) REFERENCES guestChecks(guestCheckId)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 6. Tabela menuItem
CREATE TABLE menuItem (
    guestCheckLineItemId BIGINT PRIMARY KEY,
    miNum INTEGER,
    modFlag BOOLEAN,
    inclTax DECIMAL(10, 4),
    activeTaxes VARCHAR(255),
    prcLvl INTEGER,

    FOREIGN KEY (guestCheckLineItemId) REFERENCES guestCheck_DetailLines(guestCheckLineItemId)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 7. Tabela discount
CREATE TABLE discount (
    guestCheckLineItemId BIGINT PRIMARY KEY,
    discountReason VARCHAR(255) NOT NULL,
    discountType VARCHAR(50),
    amount DECIMAL(10, 2) NOT NULL,
    isManual BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (guestCheckLineItemId) REFERENCES guestCheck_DetailLines(guestCheckLineItemId)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 8. Tabela serviceCharge
CREATE TABLE serviceCharge (
    guestCheckLineItemId BIGINT PRIMARY KEY,
    serviceChargeType VARCHAR(50) NOT NULL,
    rate DECIMAL(5, 2),
    amount DECIMAL(10, 2) NOT NULL,
    isTaxable BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (guestCheckLineItemId) REFERENCES guestCheck_DetailLines(guestCheckLineItemId)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 9. Tabela tenderMedia
CREATE TABLE tenderMedia (
    guestCheckLineItemId BIGINT PRIMARY KEY,
    tmNum INTEGER NOT NULL,
    tmName VARCHAR(50) NOT NULL,
    tmTtl DECIMAL(10, 2) NOT NULL,
    paymentProcessor VARCHAR(100),
    transactionId VARCHAR(255),

    FOREIGN KEY (guestCheckLineItemId) REFERENCES guestCheck_DetailLines(guestCheckLineItemId)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 10. Tabela errorCode
CREATE TABLE errorCode (
    guestCheckLineItemId BIGINT PRIMARY KEY,
    errorCode VARCHAR(50) NOT NULL,
    errorDescription VARCHAR(255) NOT NULL,
    severity VARCHAR(20),

    FOREIGN KEY (guestCheckLineItemId) REFERENCES guestCheck_DetailLines(guestCheckLineItemId)
        ON DELETE CASCADE ON UPDATE CASCADE
);