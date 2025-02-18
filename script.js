const { Buffer } = buffer;
const TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const connectButton = document.getElementById('connectButton');
const cleanupButton = document.getElementById('cleanupButton');
const statusElement = document.getElementById('status');
const connectView = document.getElementById('connectView');
const dashboardView = document.getElementById('dashboardView');
const walletAddress = document.getElementById('walletAddress');
let wallet = null;

const RPC_ENDPOINTS = [
    'https://mainnet.helius-rpc.com/?api-key=1c14c5e5-3c9d-4a53-97c8-9c27d398532d'
];

function getRandomRPC() {
    return RPC_ENDPOINTS[Math.floor(Math.random() * RPC_ENDPOINTS.length)];
}

function updateStatus(message, isError = false) {
    statusElement.innerHTML = message;
    statusElement.className = isError ? 'error' : 'success';
}

async function connect() {
    try {
        if (!window.solana || !window.solana.isPhantom) {
            throw new Error('Phantom wallet not found! Please install it first.');
        }

        wallet = await window.solana.connect();
        walletAddress.textContent = wallet.publicKey.toString().slice(0, 6) + '...' + wallet.publicKey.toString().slice(-4);
        
        connectView.style.display = 'none';
        dashboardView.style.display = 'block';
        
        updateStatus(`Connected successfully!`);
    } catch (err) {
        updateStatus(err.message, true);
    }
}

async function createToken() {
    try {
        const connection = new solanaWeb3.Connection(getRandomRPC(), 'confirmed');
        
        const name = document.getElementById('tokenName').value;
        const symbol = document.getElementById('tokenTicker').value;
        const price = parseFloat(document.getElementById('tokenPrice').value);
        const supply = parseInt(document.getElementById('tokenSupply').value);

        const mintKeypair = solanaWeb3.Keypair.generate();
        const mintRent = await connection.getMinimumBalanceForRentExemption(82);

        const associatedTokenAccount = await solanaWeb3.PublicKey.findProgramAddress(
            [
                wallet.publicKey.toBuffer(),
                TOKEN_PROGRAM_ID.toBuffer(),
                mintKeypair.publicKey.toBuffer(),
            ],
            new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
        );

        const transaction = new solanaWeb3.Transaction();

        transaction.add(
            solanaWeb3.SystemProgram.createAccount({
                fromPubkey: wallet.publicKey,
                newAccountPubkey: mintKeypair.publicKey,
                space: 82,
                lamports: mintRent,
                programId: TOKEN_PROGRAM_ID
            }),
            new solanaWeb3.TransactionInstruction({
                keys: [
                    { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: true },
                    { pubkey: solanaWeb3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
                ],
                programId: TOKEN_PROGRAM_ID,
                data: Buffer.from([0, ...new Uint8Array([9])])
            }),
            new solanaWeb3.TransactionInstruction({
                keys: [
                    { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
                    { pubkey: associatedTokenAccount[0], isSigner: false, isWritable: true },
                    { pubkey: wallet.publicKey, isSigner: false, isWritable: false },
                    { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: false },
                    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
                    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                    { pubkey: solanaWeb3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
                ],
                programId: new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
            }),
            new solanaWeb3.TransactionInstruction({
                keys: [
                    { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: true },
                    { pubkey: associatedTokenAccount[0], isSigner: false, isWritable: true },
                    { pubkey: wallet.publicKey, isSigner: true, isWritable: false }
                ],
                programId: TOKEN_PROGRAM_ID,
                data: Buffer.from([7, ...new Uint8Array(new BN(supply).toArray('le', 8))])
            })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        const signed = await window.solana.signTransaction(transaction);
        signed.partialSign(mintKeypair);
        
        const signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature);

        updateStatus(`
            Token created successfully!<br>
            Mint address: ${mintKeypair.publicKey.toString()}<br>
            Supply: ${supply} tokens<br>
            Price: ${price} SOL
        `);
        
    } catch (error) {
        updateStatus(error.message, true);
    }
}

document.getElementById('createTokenButton').addEventListener('click', function() {
    document.querySelector('.token-details').style.display = 'block';
    this.style.display = 'none';
});

connectButton.onclick = connect;
cleanupButton.onclick = createToken;

const tokenImage = document.getElementById('tokenImage');
const imagePreview = document.getElementById('imagePreview');

tokenImage.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.innerHTML = `<img src="${e.target.result}" alt="Token Preview">`;
        }
        reader.readAsDataURL(file);
    }
});
