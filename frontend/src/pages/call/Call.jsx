import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
// import { useToast } from '@/hooks/use-toast';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Search,
  Settings,
  LogOut,
  Users,
  Circle
} from 'lucide-react';

// Mock data
const mockUser = {
  id: 'user1',
  name: '김철수',
  email: 'kimcs@company.com',
  avatar: '',
  status: 'online'
};

const mockTeamMembers = [
  {
    id: 'user2',
    name: '이영희',
    email: 'lee@company.com',
    avatar: '',
    status: 'online',
    department: '개발팀'
  },
  {
    id: 'user3',
    name: '박민수',
    email: 'park@company.com',
    avatar: '',
    status: 'away',
    department: '기획팀'
  },
  {
    id: 'user4',
    name: '정지은',
    email: 'jung@company.com',
    avatar: '',
    status: 'busy',
    department: '디자인팀'
  },
  {
    id: 'user5',
    name: '최상훈',
    email: 'choi@company.com',
    avatar: '',
    status: 'offline',
    department: '개발팀'
  },
];

const Call = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [callStatus, setCallStatus] = useState('idle');
  const [incomingCall, setIncomingCall] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // const { toast } = useToast();

  const filteredMembers = mockTeamMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-call-success';
      case 'away': return 'bg-call-warning';
      case 'busy': return 'bg-call-danger';
      case 'offline': return 'bg-muted';
      default: return 'bg-muted';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online': return '온라인';
      case 'away': return '자리비움';
      case 'busy': return '통화중';
      case 'offline': return '오프라인';
      default: return '알 수 없음';
    }
  };

  const handleCall = (member) => {
    if (member.status === 'offline') {
      toast({
        title: "통화 불가",
        description: `${member.name}님이 오프라인 상태입니다.`,
        variant: "destructive",
      });
      return;
    }

    setSelectedMember(member);
    setCallStatus('calling');

    toast({
      title: "통화 연결 중",
      description: `${member.name}님에게 통화를 요청했습니다.`,
    });

    setTimeout(() => {
      setCallStatus('connected');
      toast({
        title: "통화 연결됨",
        description: `${member.name}님과 통화가 연결되었습니다.`,
      });
    }, 3000);
  };

  const handleHangup = () => {
    setCallStatus('idle');
    setSelectedMember(null);
    setIncomingCall(null);

    toast({
      title: "통화 종료",
      description: "통화가 종료되었습니다.",
    });
  };

  const simulateIncomingCall = () => {
    const caller = mockTeamMembers[0];
    setIncomingCall(caller);
    setCallStatus('incoming');

    toast({
      title: "수신 통화",
      description: `${caller.name}님이 통화를 요청했습니다.`,
    });
  };

  const handleAcceptCall = () => {
    if (incomingCall) {
      setSelectedMember(incomingCall);
      setCallStatus('connected');
      setIncomingCall(null);

      toast({
        title: "통화 연결됨",
        description: `${incomingCall.name}님과 통화가 연결되었습니다.`,
      });
    }
  };

  const handleDeclineCall = () => {
    setIncomingCall(null);
    setCallStatus('idle');

    toast({
      title: "통화 거절",
      description: "수신 통화를 거절했습니다.",
    });
  };

  return (
     <div className="min-h-screen bg-background flex">
      {/* 사이드바 - 팀원 목록 */}
      <div className="w-80 bg-gradient-card border-r border-border/50 flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* <Avatar className="h-10 w-10">
                <AvatarImage src={mockUser.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {mockUser.name.charAt(0)}
                </AvatarFallback>
              </Avatar> */}
              <div>
                <h3 className="font-semibold">{mockUser.name}</h3>
                <div className="flex items-center gap-2">
                  <Circle className={`h-2 w-2 ${getStatusColor(mockUser.status)} rounded-full`} />
                  <span className="text-xs text-muted-foreground">온라인</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="팀원 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
        </div>

        {/* 팀원 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">팀원 ({filteredMembers.length})</span>
          </div>

          {filteredMembers.map((member) => (
            <Card
              key={member.id}
              className="p-3 cursor-pointer hover:bg-accent/50 transition-colors bg-background/50"
              onClick={() => member.status !== 'offline' && handleCall(member)}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  {/* <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar> */}
                  <Circle 
                    className={`absolute -bottom-1 -right-1 h-3 w-3 ${getStatusColor(member.status)} rounded-full border-2 border-background`} 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{member.name}</h4>
                  <p className="text-xs text-muted-foreground">{member.department}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getStatusColor(member.status)} text-white border-none`}
                  >
                    {getStatusText(member.status)}
                  </Badge>
                  {member.status === 'online' && (
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <Phone className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* 테스트 버튼 */}
        <div className="p-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={simulateIncomingCall}
            className="w-full"
          >
            수신 통화 테스트
          </Button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col">
        {callStatus === 'idle' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="h-24 w-24 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
                <Video className="h-12 w-12 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold"></h2>
              <p className="text-muted-foreground">
                
              </p>
            </div>
          </div>
        )}

        {/* 수신 통화 화면 */}
        {callStatus === 'incoming' && incomingCall && (
          <div className="flex-1 flex items-center justify-center bg-gradient-video">
            <Card className="bg-gradient-card border-border/50 shadow-card p-8 text-center max-w-md">
              <div className="space-y-6">
                {/* <Avatar className="h-24 w-24 mx-auto">
                  <AvatarImage src={incomingCall.avatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {incomingCall.name.charAt(0)}
                  </AvatarFallback>
                </Avatar> */}
                
                <div>
                  <h3 className="text-xl font-semibold">{incomingCall.name}</h3>
                  <p className="text-muted-foreground">{incomingCall.department}</p>
                  <p className="text-sm text-muted-foreground mt-2">수신 통화</p>
                </div>

                <div className="flex gap-4 justify-center">
                  <Button
                    variant="hangup"
                    size="lg"
                    onClick={handleDeclineCall}
                    className="h-14 w-14 rounded-full"
                  >
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                  
                  <Button
                    variant="call"
                    size="lg"
                    onClick={handleAcceptCall}
                    className="h-14 w-14 rounded-full"
                  >
                    <Phone className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 통화 중 화면 */}
        {(callStatus === 'calling' || callStatus === 'connected') && selectedMember && (
          <div className="flex-1 flex flex-col">
            {/* 통화 상대 정보 */}
            <div className="p-4 bg-gradient-card border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedMember.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {selectedMember.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar> */}
                  <div>
                    <h3 className="text-lg font-semibold">{selectedMember.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedMember.department} • {callStatus === 'calling' ? '호출 중...' : '통화 중'}
                    </p>
                  </div>
                </div>
                
                <Badge className={`${callStatus === 'connected' ? 'bg-call-success' : 'bg-call-warning'} text-white`}>
                  {callStatus === 'calling' ? '연결 중' : '연결됨'}
                </Badge>
              </div>
            </div>

            {/* 비디오 영역 */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
              {/* 로컬 비디오 */}
              <Card className="bg-gradient-card border-border/50 shadow-card overflow-hidden">
                <div className="aspect-video bg-video-bg relative rounded-lg overflow-hidden">
                  {callStatus === 'connected' ? (
                    <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                      <span className="text-primary-foreground text-lg">나 (로컬)</span>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-video flex items-center justify-center">
                      <VideoOff className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="absolute bottom-4 left-4">
                    <Badge variant="outline" className="bg-background/80">
                      {mockUser.name}
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* 원격 비디오 */}
              <Card className="bg-gradient-card border-border/50 shadow-card overflow-hidden">
                <div className="aspect-video bg-video-bg relative rounded-lg overflow-hidden">
                  {callStatus === 'connected' ? (
                    <div className="w-full h-full bg-accent flex items-center justify-center">
                      <span className="text-accent-foreground text-lg">{selectedMember.name}</span>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-video flex items-center justify-center">
                      <div className="text-center">
                        {/* <Avatar className="h-16 w-16 mx-auto mb-4">
                          <AvatarImage src={selectedMember.avatar} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                            {selectedMember.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar> */}
                        <p className="text-muted-foreground">연결 대기 중...</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute bottom-4 left-4">
                    <Badge variant="outline" className="bg-background/80">
                      {selectedMember.name}
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>

            {/* 통화 컨트롤 */}
            <div className="p-4 bg-gradient-card border-t border-border/50">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant={isVideoEnabled ? "default" : "secondary"}
                  size="lg"
                  onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                  className="h-14 w-14 rounded-full"
                >
                  {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                </Button>
                
                <Button
                  variant={isAudioEnabled ? "default" : "secondary"}
                  size="lg"
                  onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                  className="h-14 w-14 rounded-full"
                >
                  {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                </Button>
                
                <Button
                  variant="hangup"
                  size="lg"
                  onClick={handleHangup}
                  className="h-16 w-16 rounded-full"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Call;
