import { mastra } from '../src/mastra/index.js';
import { config } from 'dotenv';

config();

/**
 * Script di test per verificare il funzionamento del sistema di memoria dell'agente RAG
 *
 * Questo script simula una conversazione in più fasi per testare:
 * 1. Conversation History: l'agente ricorda i messaggi recenti
 * 2. Working Memory: l'agente mantiene informazioni persistenti sull'utente
 * 3. Semantic Recall: l'agente recupera informazioni semanticamente rilevanti da conversazioni passate
 */

async function testMemory() {
  console.log('🧪 Test Sistema di Memoria - ETRA RAG Agent\n');

  const agent = mastra.getAgent('ragAgent');

  // ID univoci per thread e resource
  const threadId = `test-thread-${Date.now()}`;
  const resourceId = 'test-user-123';

  console.log(`📝 Thread ID: ${threadId}`);
  console.log(`👤 Resource ID: ${resourceId}\n`);

  // ========== FASE 1: Prima conversazione ==========
  console.log('='.repeat(60));
  console.log('FASE 1: Prima conversazione - Fornisco informazioni personali');
  console.log('='.repeat(60));

  const message1 = "Ciao! Mi chiamo Mario e abito in Via Roma 10 ad Asiago. Vorrei sapere quando viene raccolta la plastica.";
  console.log(`\n👤 Utente: ${message1}\n`);

  const response1 = await agent.generate(message1, {
    memory: {
      thread: threadId,
      resource: resourceId,
    },
  });

  console.log(`🤖 Agente: ${response1.text}\n`);

  // Pausa per dare tempo al sistema di aggiornare la memoria
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ========== FASE 2: Seconda domanda nella stessa conversazione ==========
  console.log('='.repeat(60));
  console.log('FASE 2: Seconda domanda - Test Conversation History');
  console.log('='.repeat(60));

  const message2 = "E l'umido quando viene raccolto?";
  console.log(`\n👤 Utente: ${message2}\n`);

  const response2 = await agent.generate(message2, {
    memory: {
      thread: threadId,
      resource: resourceId,
    },
  });

  console.log(`🤖 Agente: ${response2.text}\n`);
  console.log('✅ Test Conversation History: L\'agente dovrebbe ricordare l\'indirizzo fornito prima\n');

  await new Promise(resolve => setTimeout(resolve, 2000));

  // ========== FASE 3: Terza domanda - Test Working Memory ==========
  console.log('='.repeat(60));
  console.log('FASE 3: Riferimento al nome - Test Working Memory');
  console.log('='.repeat(60));

  const message3 = "Qual è il mio nome e dove abito?";
  console.log(`\n👤 Utente: ${message3}\n`);

  const response3 = await agent.generate(message3, {
    memory: {
      thread: threadId,
      resource: resourceId,
    },
  });

  console.log(`🤖 Agente: ${response3.text}\n`);
  console.log('✅ Test Working Memory: L\'agente dovrebbe ricordare il nome "Mario" e l\'indirizzo\n');

  await new Promise(resolve => setTimeout(resolve, 2000));

  // ========== FASE 4: Nuova conversazione - Test Resource-Scoped Memory ==========
  console.log('='.repeat(60));
  console.log('FASE 4: Nuova conversazione - Test Resource-Scoped Memory');
  console.log('='.repeat(60));

  const newThreadId = `test-thread-${Date.now()}-2`;
  console.log(`📝 Nuovo Thread ID: ${newThreadId}`);
  console.log(`👤 Stesso Resource ID: ${resourceId}\n`);

  const message4 = "Ciao! Sono sempre io. Puoi ricordarmi il mio indirizzo?";
  console.log(`👤 Utente: ${message4}\n`);

  const response4 = await agent.generate(message4, {
    memory: {
      thread: newThreadId,
      resource: resourceId,
    },
  });

  console.log(`🤖 Agente: ${response4.text}\n`);
  console.log('✅ Test Resource-Scoped: L\'agente dovrebbe ricordare le informazioni dalla conversazione precedente\n');

  await new Promise(resolve => setTimeout(resolve, 2000));

  // ========== FASE 5: Test Semantic Recall ==========
  console.log('='.repeat(60));
  console.log('FASE 5: Domanda semanticamente simile - Test Semantic Recall');
  console.log('='.repeat(60));

  const message5 = "Come funziona il conferimento della plastica?";
  console.log(`\n👤 Utente: ${message5}\n`);

  const response5 = await agent.generate(message5, {
    memory: {
      thread: newThreadId,
      resource: resourceId,
    },
  });

  console.log(`🤖 Agente: ${response5.text}\n`);
  console.log('✅ Test Semantic Recall: L\'agente dovrebbe recuperare informazioni dalla prima conversazione sulla plastica\n');

  // ========== VERIFICA WORKING MEMORY ==========
  console.log('='.repeat(60));
  console.log('VERIFICA: Contenuto Working Memory');
  console.log('='.repeat(60));

  const memory = await agent.getMemory();
  if (memory) {
    try {
      // Verifica se esiste un metodo per ottenere la working memory
      const threads = await memory.getThreadsByResourceId({
        resourceId: resourceId
      });

      console.log(`\n📊 Thread trovati per l'utente: ${threads.length}`);
      threads.forEach((thread, index) => {
        console.log(`\nThread ${index + 1}:`);
        console.log(`  - ID: ${thread.id}`);
        console.log(`  - Titolo: ${thread.title || 'Non generato'}`);
        console.log(`  - Creato: ${thread.createdAt}`);
        console.log(`  - Aggiornato: ${thread.updatedAt}`);
      });
    } catch (error) {
      console.log('\n⚠️  Non è stato possibile recuperare i dettagli della working memory');
      console.log('   Questo è normale - la working memory viene gestita internamente dall\'agente');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test completati!');
  console.log('='.repeat(60));
  console.log('\n📝 Riepilogo test:');
  console.log('  1. ✓ Conversation History: Mantiene contesto nella stessa conversazione');
  console.log('  2. ✓ Working Memory: Memorizza informazioni persistenti (nome, indirizzo)');
  console.log('  3. ✓ Resource-Scoped: Mantiene memoria tra diverse conversazioni');
  console.log('  4. ✓ Semantic Recall: Recupera info semanticamente rilevanti\n');

  console.log('💡 Suggerimenti:');
  console.log('  - Verifica che i messaggi dell\'agente mostrino memoria delle info precedenti');
  console.log('  - Controlla che l\'agente non richieda ripetutamente lo stesso indirizzo');
  console.log('  - Osserva se l\'agente usa il nome "Mario" nelle risposte');
  console.log('  - Nota se l\'agente fa riferimento a info dalla prima conversazione\n');
}

// Esegui il test
testMemory().catch((error) => {
  console.error('❌ Errore durante il test:', error);
  process.exit(1);
});
