"use client";

import React from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { Database, Activity, BrainCircuit, Calculator, TrendingUp } from 'lucide-react';

export default function ComoFuncionaPage() {
  const steps = [
    {
      icon: <Database className="w-6 h-6 text-[#6366F1]" />,
      title: '1. Ingestão e Sincronização (Meta Ads)',
      description: 'O MetaScale conecta-se diretamente à sua conta de anúncios através da Meta Graph API. Nós extraímos em tempo real todas as métricas brutas das suas campanhas: impressões, cliques no link, visualizações de página, checkouts iniciados e compras.',
    },
    {
      icon: <Activity className="w-6 h-6 text-[#22C55E]" />,
      title: '2. Processamento de Funil (Motor 80x10x10)',
      description: 'Com os dados em mãos, nosso motor calcula a saúde do seu funil baseando-se na regra de ouro do dropshipping/e-commerce:\n- Connect Rate (Meta: 80%): Do clique no anúncio até o carregamento da Landing Page.\n- Conversão da Página (Meta: 10%): Da visualização da página até a adição ao carrinho/checkout.\n- Conversão do Checkout (Meta: 10%): Da iniciação do checkout até o pagamento final.',
    },
    {
      icon: <BrainCircuit className="w-6 h-6 text-[#A855F7]" />,
      title: '3. Diagnóstico de Inteligência Artificial',
      description: 'As métricas mastigadas são enviadas para a nossa IA (Claude 3.5 Sonnet). Agindo como um analista sênior de performance, a IA identifica o exato gargalo da operação e devolve um diagnóstico acionável com recomendações de alta prioridade (ex: "Connect Rate de 54% - Melhore a velocidade de carregamento da sua LP").',
    },
    {
      icon: <Calculator className="w-6 h-6 text-[#F59E0B]" />,
      title: '4. Simulador de Escala e Cenários',
      description: 'Antes de colocar o seu dinheiro em risco, você utiliza o Simulador. Ajustando a Margem do seu Produto, o Orçamento Diário e as taxas do seu funil atual, o sistema projeta exatamente qual será o seu Faturamento, CPA, ROAS e Lucro Líquido Real.',
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-[#EF4444]" />,
      title: '5. Decisão: Otimizar vs Escalar',
      description: 'Se as simulações indicarem lucro e as métricas baterem a regra 80x10x10, o painel libera o status "ESCALÁVEL". Se os números não baterem, o sistema sinaliza "OTIMIZAR", forçando você a resolver os problemas na página ou criativo antes de injetar mais orçamento.',
    }
  ];

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <TopBar 
        title="Como Funciona o MetaScale" 
        subtitle="Entenda o motor por trás do seu novo cockpit de anúncios" 
      />

      <div className="mt-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#2A2A38] before:to-transparent">
        {steps.map((step, index) => (
          <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-12 last:mb-0">
            {/* Icon Circle */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0F0F13] bg-[#1A1A24] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              {step.icon}
            </div>
            
            {/* Content Box */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[#1A1A24] border border-[#2A2A38] p-6 rounded-xl shadow-sm transition-all hover:border-[#3A3A48]">
              <div className="flex items-center justify-between space-x-2 mb-2">
                <h3 className="font-semibold text-lg text-[#F1F1F3]">{step.title}</h3>
              </div>
              <p className="text-[#8B8BA0] whitespace-pre-line text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 bg-gradient-to-r from-[#6366F1]/10 to-[#A855F7]/10 border border-[#6366F1]/20 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-semibold text-white mb-4">Governança de Elite</h2>
        <p className="text-[#8B8BA0] max-w-2xl mx-auto leading-relaxed">
          O MetaScale não foi criado para ser mais um dashboard genérico. Ele foi forjado para responder à única pergunta que importa no tráfego pago: <strong className="text-[#F1F1F3]">"Se eu injetar dinheiro hoje, eu vou lucrar amanhã?"</strong>. Completude absoluta, sem atalhos.
        </p>
      </div>
    </div>
  );
}
