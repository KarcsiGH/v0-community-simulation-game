import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building2, Target, Network } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-5xl font-bold tracking-tight mb-4 text-balance">Community Simulation Platform</h1>
          <p className="text-xl text-muted-foreground text-balance">
            Model organizations, individuals, and community dynamics to inform strategic planning
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <Building2 className="w-10 h-10 text-primary mb-2" />
              <CardTitle>Entity Profiles</CardTitle>
              <CardDescription>Build comprehensive profiles of organizations and individuals</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/entities/new">
                <Button className="w-full">Create Entity</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <Users className="w-10 h-10 text-primary mb-2" />
              <CardTitle>View Entities</CardTitle>
              <CardDescription>Browse and manage all community entities</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/entities">
                <Button variant="secondary" className="w-full">
                  View All
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <Network className="w-10 h-10 text-primary mb-2" />
              <CardTitle>Communities</CardTitle>
              <CardDescription>Define ecosystems and discover stakeholders</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/communities">
                <Button variant="secondary" className="w-full">
                  Manage
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <Target className="w-10 h-10 text-primary mb-2" />
              <CardTitle>Simulations</CardTitle>
              <CardDescription>Run multi-year community simulations</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/simulations">
                <Button variant="secondary" className="w-full">
                  View Simulations
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Collect Entity Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Use automated web scraping, document uploads, and interactive forms to build comprehensive entity
                    profiles
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Define Relationships</h3>
                  <p className="text-sm text-muted-foreground">
                    Map connections, alliances, and tensions between entities in your community
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Run Simulations</h3>
                  <p className="text-sm text-muted-foreground">
                    Test strategic scenarios and see how different decisions ripple through the community
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
