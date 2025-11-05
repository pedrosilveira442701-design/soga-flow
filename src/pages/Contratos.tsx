import { Construction } from "lucide-react";

export default function Contratos() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Construction className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Contratos - Em Desenvolvimento</h2>
        <p className="text-muted-foreground">
          A página de gestão de contratos será implementada em breve
        </p>
      </div>
    </div>
  );
}
