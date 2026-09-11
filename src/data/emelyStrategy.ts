import { ClientStrategyDocument } from '../types';

export const EMELY_STRATEGY_DOCUMENT: ClientStrategyDocument = {
  id: 'strat_emely_noivas',
  title: 'Emely Moda Festa',
  subtitle: 'Estratégia para ampliar a presença e transformar procura em vendas.',
  cycleMeta: 'PLANO DE MARCA, CONTEÚDO E AQUISIÇÃO • SETEMBRO 2026',
  keyDecisions: {
    centralDecision: 'Comunicar a amplitude da loja com clareza e transformar procura em fechamento.',
    positioning: 'Acessível sem parecer barato: linguagem elegante, simples e clara.',
    cyclePriority: 'Acompanhar cada oportunidade até visita, venda e receita.',
  },
  chapters: [
    {
      id: 'chap-01',
      number: '01',
      tag: '01 · MARCA E PÚBLICOS',
      title: 'Marca e proposta de valor',
      subtitle: 'Tornar a amplitude da Emely visível, com uma apresentação elegante e próxima.',
      callout: {
        quote: 'A roupa certa para um momento importante precisa funcionar no corpo real, no orçamento real e na experiência real da cliente.',
        caption: 'ESSÊNCIA DE MARCA',
        authorOrLabel: 'Posicionamento Emely',
      },
      contentMarkdown: `### Pilares da Proposta de Valor

1. **Amplitude com Curadoria**: Atendimento completo em moda festa e trajes a rigor: vestidos de noiva, debutante, moda festa feminina, ternos masculinos e trajes infantis.
2. **Ajuste Impecável e Segurança**: Modelagem precisa, ateliê de ajustes experiente e garantia de que tudo estará perfeito até o dia do evento.
3. **Acolhimento sem Intimidação**: Atendimento humano, transparente e respeitoso ao orçamento da família, quebrando a barreira de que lojas requintadas cobram preços inatingíveis.

### Atributos de Diferenciação
* **Loja Completa para Toda a Família**: Noivos, padrinhos, madrinhas e daminhas encontram tudo no mesmo local, economizando tempo e garantindo harmonia visual.
* **Experiência Presencial Humanizada**: Prova guiada por consultoras que entendem de caimento, biotipos e protocolos de eventos.`,
    },
    {
      id: 'chap-02',
      number: '02',
      tag: '02 · OFERTA E DEMANDA',
      title: 'Portfólio e públicos',
      subtitle: 'Cada linha cumpre um papel diferente na receita, e cada ocasião pede uma conversa própria.',
      portfolioItems: [
        {
          icon: '👑',
          title: 'Noivas',
          description: 'Aluguel, modelos de produção própria, provas e ajustes, acessórios e joias.',
          tag: 'Linha de destaque: maior carga emocional e potencial de ticket.',
        },
        {
          icon: '✨',
          title: 'Moda festa feminina',
          description: 'Madrinhas, convidadas, formandas e mães; aluguel e venda pontual.',
          tag: 'Volume e recorrência: amplia a frequência de compra.',
        },
        {
          icon: '🌟',
          title: 'Debutantes',
          description: 'Vestidos e soluções ligadas aos 15 anos.',
          tag: 'Pilar próprio de comunicação e campanhas sazonais.',
        },
        {
          icon: '👔',
          title: 'Masculino',
          description: 'Ternos adultos e infantis; conjunto com camisa, colete, suspensório e gravata.',
          tag: 'Diferencial de loja completa e venda cruzada familiar.',
        },
        {
          icon: '👶',
          title: 'Infantil',
          description: 'Damas, daminhas e ternos infantis.',
          tag: 'Complemento do evento e argumento de conveniência.',
        },
        {
          icon: '💎',
          title: 'Acessórios',
          description: 'Joias e coroas para noivas; brincos, colares, pulseiras e bolsas.',
          tag: 'Upsell e composição de look.',
        },
      ],
      occasions: [
        {
          role: 'Noiva',
          description: 'Vestido que represente o casamento, caia bem e fique pronto e ajustado com segurança.',
          priority: 'Alta',
        },
        {
          role: 'Madrinha e convidada',
          description: 'Respeitar paleta e ocasião, encontrar modelo adequado ao corpo e ao orçamento.',
          priority: 'Alta',
        },
        {
          role: 'Formanda',
          description: 'Modelo de destaque que valorize o estilo individual para fotos e baile de gala.',
          priority: 'Alta (Sazonal)',
        },
        {
          role: 'Mãe dos noivos',
          description: 'Elegância clássica, conforto duradouro e harmonia visual com o altar.',
          priority: 'Média-alta',
        },
        {
          role: 'Debutante',
          description: 'Realização do sonho dos 15 anos com opções de valsa e balada.',
          priority: 'Alta (Sazonal)',
        },
      ],
    },
    {
      id: 'chap-03',
      number: '03',
      tag: '03 · DA OCASIÃO AO PÓS-EVENTO',
      title: 'Jornada e atendimento',
      subtitle: 'A comunicação inicia a conversa. O processo comercial dá continuidade à escolha.',
      journeySteps: [
        {
          step: '01',
          name: 'Gatilho',
          quote: '"Tenho um casamento, formatura ou 15 anos."',
          touchpoints: 'Instagram, indicação, Google Search',
        },
        {
          step: '02',
          name: 'Pesquisa',
          quote: '"Que lojas têm o que preciso?"',
          touchpoints: 'Search e Maps, Reels, carrosséis no Feed',
        },
        {
          step: '03',
          name: 'Filtragem',
          quote: '"Tem minha cor, tamanho, estilo e faixa?"',
          touchpoints: 'Catálogo online, Destaques, WhatsApp direto',
        },
        {
          step: '04',
          name: 'Prova',
          quote: '"Será que fica bom em mim?"',
          touchpoints: 'Atendimento presencial e ajustes guiados',
        },
        {
          step: '05',
          name: 'Decisão',
          quote: '"Vale o preço? Posso confiar?"',
          touchpoints: 'Proposta clara, contrato de reserva, prova social',
        },
        {
          step: '06',
          name: 'Preparação',
          quote: '"Vai ficar pronto e certo no prazo?"',
          touchpoints: 'Follow-up de prova final e retirada com capa protetora',
        },
        {
          step: '07',
          name: 'Pós-evento',
          quote: '"Fiquei satisfeita e fui elogiada!"',
          touchpoints: 'Avaliação no Google, foto oficial e indicação para amigas',
        },
      ],
      commercialSteps: [
        {
          step: '1',
          title: 'Boas-vindas calorosas',
          description: 'Acolher a cliente em até 10 minutos, perguntando o tipo de evento e a data prevista.',
        },
        {
          step: '2',
          title: 'Identificação de estilo e paleta',
          description: 'Solicitar referências ou a cor exigida pelo convite/noiva para filtrar o acervo.',
        },
        {
          step: '3',
          title: 'Envio de 3 a 5 modelos reais em vídeo',
          description: 'Demonstrar o movimento e o brilho das peças no corpo em vez de fotos estáticas de cabide.',
        },
        {
          step: '4',
          title: 'Convite para agendamento de prova com consultora',
          description: 'Reservar um horário exclusivo no provador VIP com direito a levar acompanhante.',
        },
        {
          step: '5',
          title: 'Lembrete amigável na véspera',
          description: 'Mensagem confirmando o horário e enviando a localização precisa e orientações de estacionamento.',
        },
      ],
      bottleneck: {
        title: 'Gargalo Crítico: Tempo de Resposta no WhatsApp',
        subtitle: 'Capacidade de resposta e velocidade de atendimento inicial',
        description: 'Mais de 65% das noivas e madrinhas desistem de agendar se a primeira resposta no WhatsApp demorar mais de 30 minutos em horário comercial. Padronizar scripts de saudação rápida e botão com links diretos para o catálogo é a prioridade zero de vendas.',
      },
    },
    {
      id: 'chap-04',
      number: '04',
      tag: '04 · CONTEÚDO E LINGUAGEM',
      title: 'Conteúdo e linguagem',
      subtitle: 'Linhas editoriais que geram desejo, confiança técnica e cliques para o WhatsApp.',
      contentMarkdown: `### Pilares de Conteúdo

* **Pilar 1: Desejo & Caimento Real (40%)**:
  * Vídeos em alta definição com modelos e clientes reais desfilando os vestidos em luz natural.
  * Foco em detalhes: bordados feitos à mão, pedrarias, fendas, tecidos fluidos e costas trabalhadas.
* **Pilar 2: Utilidade & Dúvidas de Protocolo (30%)**:
  * "O que a mãe da noiva pode ou não usar?"
  * "Vestidos ideais para casamento de dia no campo vs. noite na igreja."
  * "Como escolher o terno masculino conforme o horário da festa."
* **Pilar 3: Prova Social & Casamentos Reais (20%)**:
  * Depoimentos de noivas emocionadas na retirada do vestido.
  * Fotos oficiais marcadas pelas clientes nos casamentos.
* **Pilar 4: Bastidores & Ateliê (10%)**:
  * O processo minucioso de ajuste da costureira, a higienização cuidadosa a vapor e a entrega na capa personalizada.

### Diretrizes Visuais
* **Fotografia**: Tons quentes e suaves, fundo neutro, sem saturação excessiva que distorça a cor real dos tecidos.
* **Tom de Voz**: Elegante, acolhedor, empático, celebrativo e prestativo. Jamais arrogante ou inacessível.`,
    },
    {
      id: 'chap-05',
      number: '05',
      tag: '05 · PRESENÇA E AQUISIÇÃO',
      title: 'Presença e aquisição',
      subtitle: 'Canais de atração de demanda e tráfego qualificado para a loja física.',
      contentMarkdown: `### Estratégia de Mídia Paga (Meta Ads)

* **Campanha 1: Noivas & Debutantes (Tráfego de Alto Valor)**:
  * Segmentação: Mulheres noivas no status de relacionamento, interesses em vestidos de casamento e debutantes.
  * Raio de alcance: Cidade polo + municípios em um raio de 40 km.
  * Objetivo: Iniciar conversa no WhatsApp com oferta de degustação de prova exclusiva.
* **Campanha 2: Madrinhas por Paleta de Cores**:
  * Carrosséis divididos por cores tendência (Terracota, Verde Oliva, Azul Serenity, Marsala).
  * Chamada: "Foi convidada para ser madrinha? Encontre o tom exato da sua noiva na Emely."

### Otimização do Google Meu Negócio (SEO Local)
* Atualização semanal de fotos dos novos vestidos na ficha do Google.
* Monitoramento de palavras-chave: "aluguel de vestido de festa", "loja de noivas perto de mim", "ternos para casamento".
* Meta de atingir 150+ avaliações 5 estrelas no Google Maps através de QR Code no balcão de devolução.`,
    },
    {
      id: 'chap-06',
      number: '06',
      tag: '06 · MERCADO E ANÁLISE SWOT',
      title: 'Mercado e SWOT',
      subtitle: 'Diagnóstico estratégico de forças, fragilidades e oportunidades da marca.',
      swot: {
        strengths: [
          'Variedade ímpar de modelos que atende noivas, festas, formaturas e trajes masculinos sob o mesmo teto.',
          'Ateliê próprio com costureiras experientes que realizam ajustes sob medida.',
          'Localização de fácil acesso e espaço físico amplo com provadores reservados.',
          'Reputação sólida e clientes satisfeitas que indicam recorrentemente.',
        ],
        weaknesses: [
          'Comunicação anterior pouco padronizada e fotos que não refletiam o valor real das peças.',
          'Dependência de resposta manual no WhatsApp durante os finais de semana.',
          'Catálogo digital desatualizado com peças que já não estavam mais disponíveis.',
        ],
        opportunities: [
          'Boom de formaturas e casamentos represados nos próximos trimestres.',
          'Produção de conteúdos em formato Reels mostrando provas reais de clientes de diferentes biotipos.',
          'Parcerias estratégicas com cerimonialistas, buffets e maquiadores locais.',
          'Venda cruzada: vestir o noivo e os padrinhos na mesma compra da noiva e madrinhas.',
        ],
        threats: [
          'Concorrência de lojas de compra online descartáveis com tecidos de baixa qualidade.',
          'Oscilação de datas de grandes eventos devido a sazonalidades climáticas e econômicas.',
        ],
      },
    },
    {
      id: 'chap-07',
      number: '07',
      tag: '07 · KPIS E MENSURAÇÃO',
      title: 'KPIs e mensuração',
      subtitle: 'Métricas claras para acompanhar o retorno do investimento em marketing.',
      kpis: [
        {
          metric: 'Leads no WhatsApp',
          target: '350 contatos/mês',
          frequency: 'Semanal',
          why: 'Volume de oportunidades brutas vindas do Instagram e anúncios.',
        },
        {
          metric: 'Agendamentos de Prova',
          target: '120 provas/mês',
          frequency: 'Semanal',
          why: 'Indicador chave de conversão do atendimento online para o presencial.',
        },
        {
          metric: 'Taxa de Fechamento Presencial',
          target: '≥ 55%',
          frequency: 'Mensal',
          why: 'Eficácia das consultoras da loja durante a experiência no provador.',
        },
        {
          metric: 'Custo por Lead (CPL)',
          target: 'R$ 2,50 a R$ 4,80',
          frequency: 'Diária',
          why: 'Eficiência das campanhas de tráfego pago no Meta Ads.',
        },
        {
          metric: 'Novos Seguidores Qualificados',
          target: '+800 / mês',
          frequency: 'Mensal',
          why: 'Construção contínua de audiência local para o ciclo de vendas.',
        },
      ],
    },
    {
      id: 'chap-08',
      number: '08',
      tag: '08 · PLANO DE 90 DIAS',
      title: 'Plano de 90 dias',
      subtitle: 'Cronograma tático de implementação e aceleração das vendas.',
      quarterPlan: [
        {
          month: 'Mês 1 · Fundação & Padronização',
          title: 'Arrumação da Casa & Posicionamento',
          focus: 'Alinhar a identidade visual, produzir o novo banco de imagens e ajustar o funil do WhatsApp.',
          actions: [
            'Sessão de fotos e vídeos profissionais com os 25 vestidos mais pedidos da temporada.',
            'Criação da árvore de Destaques estratégicos no Instagram (Noivas, Madrinhas, Debutantes, Avaliações, Local).',
            'Configuração das respostas rápidas no WhatsApp Business com fotos e vídeos explicativos.',
            'Lançamento da primeira leva de posts com o novo padrão estético BeeWave.',
          ],
        },
        {
          month: 'Mês 2 · Tração & Campanhas Temáticas',
          title: 'Aceleração de Demanda & Campanhas Segmentadas',
          focus: 'Ativar campanhas patrocinadas no Instagram para Noivas e Madrinhas.',
          actions: [
            'Início dos anúncios patrocinados no Meta Ads com vídeos em alta definição.',
            'Campanha especial: "Temporada das Noivas: agende sua prova exclusiva com champanhe".',
            'Série semanal de carrosséis: "Paletas do Ano para Madrinhas".',
            'Campanha de coleta de depoimentos em vídeo de clientes que usaram as peças.',
          ],
        },
        {
          month: 'Mês 3 · Escala & Parcerias Estratégicas',
          title: 'Consolidação & Expansão de Parcerias',
          focus: 'Ampliar a receita média por cliente através de trajes masculinos e parcerias.',
          actions: [
            'Lançamento da comunicação integrada da linha masculina ("Vista o Noivo e os Padrinhos").',
            'Café com cerimonialistas e maquiadores da cidade para apresentação do acervo e comissionamento.',
            'Otimização do custo por lead nos anúncios pagos baseada nas melhores métricas do Mês 2.',
            'Revisão dos resultados no Relatório Trimestral Executivo.',
          ],
        },
      ],
    },
    {
      id: 'chap-09',
      number: '09',
      tag: '09 · ESCOPO E RESPONSABILIDADES',
      title: 'Escopo e responsabilidades',
      subtitle: 'Divisão clara de papéis entre a agência BeeWave e a equipe Emely Moda Festa.',
      responsibilities: [
        {
          category: 'Estratégia & Planejamento',
          agency: ['Definição dos temas mensais, datas comemorativas e pautas alinhadas ao calendário de casamentos.'],
          client: ['Informar novas chegadas de vestidos, tendências procuradas e promoções de estoque.'],
        },
        {
          category: 'Criação & Design',
          agency: ['Elaboração dos briefings, redação de legendas, roteiros de Reels e edição visual das peças.'],
          client: ['Aprovar com agilidade as pautas enviadas no Portal do Cliente em até 48 horas.'],
        },
        {
          category: 'Captação & Conteúdo Bruto',
          agency: ['Orientação e roteiro prévio de como gravar vídeos das clientes e vestidos na loja.'],
          client: ['Gravar vídeos curtos de provas e vestidos no celular conforme o roteiro e subir no Drive/Portal.'],
        },
        {
          category: 'Tráfego & Anúncios',
          agency: ['Configuração, testes A/B, monitoramento diário e otimização do orçamento no Meta Ads.'],
          client: ['Fornecer acesso de anunciante e manter o cartão de crédito dos anúncios ativo.'],
        },
        {
          category: 'Comercial & Vendas',
          agency: ['Garantir que as campanhas gerem mensagens qualificadas no WhatsApp da loja.'],
          client: ['Atender rapidamente os leads, agendar as provas presenciais e realizar o fechamento.'],
        },
      ],
    },
    {
      id: 'chap-10',
      number: '10',
      tag: '10 · GLOSSÁRIO E FONTES',
      title: 'Glossário e fontes',
      subtitle: 'Conceitos técnicos, terminologias da indústria e referências bibliográficas do plano.',
      glossary: [
        {
          term: 'Alta-Costura / Demi-Couture',
          definition: 'Peças feitas sob medida com técnicas artesanais, tecidos nobres e acabamentos manuais de excelência.',
        },
        {
          term: 'Paleta de Cores da Noiva',
          definition: 'Conjunto de tonalidades restritas ou sugeridas pela noiva para que as madrinhas subam ao altar em harmonia.',
        },
        {
          term: 'Upsell de Traje Completo',
          definition: 'Estratégia de oferecer camisa, colete, gravata e abotoaduras na locação do terno, aumentando o ticket médio.',
        },
        {
          term: 'Custo por Lead (CPL)',
          definition: 'Valor investido em mídia para que uma cliente em potencial clique e inicie uma conversa no WhatsApp.',
        },
        {
          term: 'Taxa de Comparecimento (Show-up Rate)',
          definition: 'Percentual de clientes que efetivamente comparecem na loja física no dia e horário agendados para a prova.',
        },
      ],
    },
  ],
};
