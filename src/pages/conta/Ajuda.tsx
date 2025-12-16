import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, Book, Keyboard, Mail } from "lucide-react";

const atalhos = [
  { keys: "Ctrl + K", descricao: "Abrir busca rápida" },
  { keys: "Ctrl + B", descricao: "Alternar sidebar" },
  { keys: "Ctrl + /", descricao: "Mostrar atalhos" },
  { keys: "Esc", descricao: "Fechar modal/diálogo" },
];

const faqs = [
  {
    pergunta: "Como adicionar um novo cliente?",
    resposta:
      'Navegue até a página "Clientes" e clique no botão "Novo Cliente". Preencha o formulário com as informações necessárias e clique em "Salvar".',
  },
  {
    pergunta: "Como criar uma visita?",
    resposta:
      'Acesse a página "Visitas" e clique em "Nova Visita". Selecione o cliente, defina a data/hora e o tipo de visita, e salve.',
  },
  {
    pergunta: "Como acompanhar leads?",
    resposta:
      "Use o quadro Kanban na página de Leads para visualizar e mover leads entre os diferentes estágios do funil de vendas.",
  },
  {
    pergunta: "Como configurar notificações?",
    resposta:
      'Acesse "Minha Conta" > "Preferências" > "Notificações" para configurar quais notificações você deseja receber e por quais canais.',
  },
  {
    pergunta: "Como exportar dados?",
    resposta:
      "Em cada página de listagem (Clientes, Contratos, etc.), você encontrará um botão de exportação que permite baixar os dados em formato CSV ou Excel.",
  },
];

export default function Ajuda() {
  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-h1 flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Ajuda & Atalhos
        </h1>
        <p className="text-muted-foreground mt-2">
          Encontre respostas e aprenda a usar o sistema
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Keyboard className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold">Atalhos de Teclado</h3>
          </div>
          <div className="space-y-3">
            {atalhos.map((atalho, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm">{atalho.descricao}</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">
                  {atalho.keys}
                </kbd>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold">Suporte</h3>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Precisa de ajuda? Entre em contato com nossa equipe de suporte.
            </p>
            <Button className="w-full" variant="outline">
              <Mail className="icon-md mr-2" />
              Enviar Mensagem
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <HelpCircle className="icon-md text-primary" />
          </div>
          <h3 className="font-semibold">Perguntas Frequentes</h3>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                {faq.pergunta}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.resposta}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>

      <Card className="p-6 bg-muted/30">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Book className="icon-md text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-sm mb-1">Documentação Completa</h4>
            <p className="text-sm text-muted-foreground">
              Para um guia completo sobre todas as funcionalidades do sistema,
              consulte nossa documentação online.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
